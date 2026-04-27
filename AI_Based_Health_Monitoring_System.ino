#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ThreeWire.h>
#include <RtcDS1302.h>
#include <math.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include <ArduinoJson.h>

// -------------------------
// OLED
// -------------------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// -------------------------
// DS1302 RTC
// -------------------------
#define DS1302_CLK 19
#define DS1302_DAT 18
#define DS1302_RST 5
ThreeWire myWire(DS1302_DAT, DS1302_CLK, DS1302_RST);
RtcDS1302<ThreeWire> rtc(myWire);

// -------------------------
// XD58C Pulse Sensor
// -------------------------
#define PULSE_PIN 34
int currentBPM = 0;
int lastSentBPM = -1;
String currentBPMStatus = "normal";
String lastSentBPMStatus = "";

// -------------------------
// NTC 100K Thermistor
// -------------------------
#define NTC_PIN 32
const float R_FIXED = 10000.0;
const float BETA = 3950.0;
const float R0 = 100000.0;
const float TEMP_REF = 298.15;
float currentTemperature = 0;
float lastSentTemperature = -1;
String currentTempStatus = "normal";
String lastSentTempStatus = "";

// -------------------------
// Wi-Fi & Firebase
// -------------------------
const char* ssid = "LB_ADSL_ESHX";
const char* password = "Kt9AFH2xgHdoafvEaX";
const char* firebaseBaseURL = "https://ai-based-health-system-b2b70-default-rtdb.firebaseio.com";

// NTP Server settings for automatic time sync
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 3600;  // Morocco GMT+1
const int daylightOffset_sec = 0;

// -------------------------
// Thresholds for status determination
// -------------------------
// Temperature thresholds (in Celsius)
const float TEMP_LOW_THRESHOLD = 36.0;      // Below 36.0°C = low
const float TEMP_HIGH_THRESHOLD = 37.5;     // Above 37.5°C = high
const float TEMP_FEVER_THRESHOLD = 38.0;    // Above 38.0°C = fever

// BPM thresholds (beats per minute)
const int BPM_LOW_THRESHOLD = 60;           // Below 60 = low
const int BPM_HIGH_THRESHOLD = 100;         // Above 100 = high

// -------------------------
// Timing variables
// -------------------------
unsigned long lastDisplayUpdate = 0;
unsigned long lastSensorRead = 0;
unsigned long lastFirebaseSend = 0;
unsigned long lastRTCSync = 0;
const unsigned long DISPLAY_UPDATE_INTERVAL = 100;    // Update OLED every 100ms
const unsigned long SENSOR_READ_INTERVAL = 50;        // Read sensors every 50ms
const unsigned long FIREBASE_SEND_INTERVAL = 2000;    // Send every 2 seconds
const unsigned long RTC_SYNC_INTERVAL = 3600000;      // Sync RTC every hour

// BPM filter for smoother readings
const int SAMPLE_SIZE = 10;
int bpmSamples[SAMPLE_SIZE];
int sampleIndex = 0;
bool samplesFilled = false;

// -------------------------
// Function to determine temperature status
// -------------------------
String getTemperatureStatus(float temp) {
  if (temp >= TEMP_FEVER_THRESHOLD) {
    return "fever";
  } else if (temp > TEMP_HIGH_THRESHOLD) {
    return "high";
  } else if (temp < TEMP_LOW_THRESHOLD) {
    return "low";
  } else {
    return "normal";
  }
}

// -------------------------
// Function to determine BPM status
// -------------------------
String getBPMStatus(int bpm) {
  if (bpm > BPM_HIGH_THRESHOLD) {
    return "high";
  } else if (bpm < BPM_LOW_THRESHOLD) {
    return "low";
  } else {
    return "normal";
  }
}

// -------------------------
// Function to format time string
// -------------------------
String formatTimeString(RtcDateTime dt) {
  char timeStr[20];
  sprintf(timeStr, "%04u-%02u-%02u %02u:%02u:%02u",
          dt.Year(), dt.Month(), dt.Day(),
          dt.Hour(), dt.Minute(), dt.Second());
  return String(timeStr);
}

// -------------------------
// Function to get current Unix timestamp
// -------------------------
unsigned long getUnixTimestamp(RtcDateTime dt) {
  return dt.Epoch32Time();
}

// -------------------------
// Function to send data to Firebase with time and status
// -------------------------
void sendToFirebase(RtcDateTime currentTime, int bpm, float temperature, String bpmStatus, String tempStatus) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, attempting reconnect...");
    WiFi.reconnect();
    return;
  }
  
  unsigned long unixTime = getUnixTimestamp(currentTime);
  String timeString = formatTimeString(currentTime);
  
  bool bpmChanged = (bpm != lastSentBPM) || (bpmStatus != lastSentBPMStatus);
  bool tempChanged = (abs(temperature - lastSentTemperature) > 0.05) || (tempStatus != lastSentTempStatus);
  
  // Create JSON document for temperature (with time and status)
  StaticJsonDocument<250> tempDoc;
  tempDoc["temperature"] = temperature;
  tempDoc["unit"] = "celsius";
  tempDoc["status"] = tempStatus;
  tempDoc["time"] = timeString;
  tempDoc["hour"] = currentTime.Hour();
  tempDoc["minute"] = currentTime.Minute();
  tempDoc["second"] = currentTime.Second();
  tempDoc["day"] = currentTime.Day();
  tempDoc["month"] = currentTime.Month();
  tempDoc["year"] = currentTime.Year();
  
  // Create JSON document for BPM (with time and status)
  StaticJsonDocument<250> bpmDoc;
  bpmDoc["bpm"] = bpm;
  bpmDoc["status"] = bpmStatus;
  bpmDoc["time"] = timeString;
  bpmDoc["hour"] = currentTime.Hour();
  bpmDoc["minute"] = currentTime.Minute();
  bpmDoc["second"] = currentTime.Second();
  bpmDoc["day"] = currentTime.Day();
  bpmDoc["month"] = currentTime.Month();
  bpmDoc["year"] = currentTime.Year();
  
  HTTPClient http;
  
  // 1. Send Temperature data to /temperature/ node
  if (tempChanged) {
    http.begin(String(firebaseBaseURL) + "/temperature/" + String(unixTime) + ".json");
    http.addHeader("Content-Type", "application/json");
    String tempJson;
    serializeJson(tempDoc, tempJson);
    int tempResponse = http.PUT(tempJson);
    
    if (tempResponse == 200) {
      Serial.printf("✓ Temperature: %.2f°C (%s) at %s\n", temperature, tempStatus.c_str(), timeString.c_str());
      lastSentTemperature = temperature;
      lastSentTempStatus = tempStatus;
    } else {
      Serial.printf("✗ Temperature error: %d\n", tempResponse);
    }
    http.end();
    delay(50);
  }
  
  // 2. Send BPM data to /bpm/ node
  if (bpmChanged) {
    http.begin(String(firebaseBaseURL) + "/bpm/" + String(unixTime) + ".json");
    http.addHeader("Content-Type", "application/json");
    String bpmJson;
    serializeJson(bpmDoc, bpmJson);
    int bpmResponse = http.PUT(bpmJson);
    
    if (bpmResponse == 200) {
      Serial.printf("✓ BPM: %d BPM (%s) at %s\n", bpm, bpmStatus.c_str(), timeString.c_str());
      lastSentBPM = bpm;
      lastSentBPMStatus = bpmStatus;
    } else {
      Serial.printf("✗ BPM error: %d\n", bpmResponse);
    }
    http.end();
  }
}

// -------------------------
// Function to set RTC time from NTP
// -------------------------
void setRTCTimeFromNTP() {
  struct tm timeinfo;
  
  if (getLocalTime(&timeinfo)) {
    RtcDateTime ntpTime(
      timeinfo.tm_year + 1900,
      timeinfo.tm_mon + 1,
      timeinfo.tm_mday,
      timeinfo.tm_hour,
      timeinfo.tm_min,
      timeinfo.tm_sec
    );
    
    rtc.SetDateTime(ntpTime);
    
    Serial.print("RTC synced: ");
    Serial.printf("%04u-%02u-%02u %02u:%02u:%02u\n",
                  ntpTime.Year(), ntpTime.Month(), ntpTime.Day(),
                  ntpTime.Hour(), ntpTime.Minute(), ntpTime.Second());
  } else {
    Serial.println("Failed to get NTP time");
  }
}

// -------------------------
// BPM reading with filtering
// -------------------------
int readBPM() {
  int sensorValue = analogRead(PULSE_PIN);
  unsigned long currentTime = millis();
  
  int threshold = 2000;
  static bool lastState = false;
  static unsigned long lastBeatTime = 0;
  static unsigned long beatInterval = 0;
  static int rawBPM = 0;
  
  bool currentState = (sensorValue > threshold);
  
  if (currentState && !lastState) {
    if (lastBeatTime != 0) {
      beatInterval = currentTime - lastBeatTime;
      if (beatInterval > 300 && beatInterval < 1500) {
        rawBPM = 60000 / beatInterval;
        
        bpmSamples[sampleIndex] = rawBPM;
        sampleIndex = (sampleIndex + 1) % SAMPLE_SIZE;
        
        if (sampleIndex == 0) {
          samplesFilled = true;
        }
      }
    }
    lastBeatTime = currentTime;
  }
  lastState = currentState;
  
  int sum = 0;
  int count = samplesFilled ? SAMPLE_SIZE : sampleIndex;
  
  if (count == 0) {
    return currentBPM;
  }
  
  for (int i = 0; i < count; i++) {
    sum += bpmSamples[i];
  }
  
  int averagedBPM = sum / count;
  
  if (averagedBPM >= 40 && averagedBPM <= 200) {
    currentBPM = averagedBPM;
  }
  
  return currentBPM;
}

// -------------------------
// Temperature reading with filtering
// -------------------------
float readTemperatureNTC() {
  const int NUM_SAMPLES = 5;
  float sum = 0;
  
  for (int i = 0; i < NUM_SAMPLES; i++) {
    int adcValue = analogRead(NTC_PIN);
    float Vout = adcValue * (3.3 / 4095.0);
    
    if (Vout > 0.01) {
      float R_NTC = R_FIXED * (3.3 / Vout - 1);
      float tempK = 1.0 / ((1.0 / TEMP_REF) + (1.0 / BETA) * log(R_NTC / R0));
      float tempC = tempK - 273.15;
      tempC += 3.0;
      sum += tempC;
    }
    delay(2);
  }
  
  return sum / NUM_SAMPLES;
}

// -------------------------
// OLED Display Update (without status)
// -------------------------
void updateDisplay(RtcDateTime currentTime) {
  display.clearDisplay();
  
  // Time
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.printf("%02u:%02u:%02u", currentTime.Hour(), currentTime.Minute(), currentTime.Second());
  
  // Date
  display.setTextSize(1);
  display.setCursor(0, 24);
  display.printf("%02u/%02u/%04u", currentTime.Day(), currentTime.Month(), currentTime.Year());
  
  // Heart Rate
  display.setTextSize(2);
  display.setCursor(0, 36);
  display.printf("BPM:%d", currentBPM);
  
  // Heart icon
  display.fillCircle(110, 48, 3, SSD1306_WHITE);
  display.fillCircle(118, 48, 3, SSD1306_WHITE);
  display.fillTriangle(107, 48, 114, 58, 121, 48, SSD1306_WHITE);
  
  // Temperature
  display.setTextSize(1);
  display.setCursor(0, 56);
  display.printf("T:%.1fC", currentTemperature);
  
  // Wi-Fi indicator
  if (WiFi.status() == WL_CONNECTED) {
    display.fillCircle(123, 5, 2, SSD1306_WHITE);
  } else {
    display.drawCircle(123, 5, 2, SSD1306_WHITE);
  }
  
  display.display();
}

// --------------------------------------
void setup() {
  Serial.begin(115200);
  
  // OLED init
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED allocation failed");
    for(;;);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  
  // RTC init
  rtc.Begin();
  
  // Initialize BPM filter
  for (int i = 0; i < SAMPLE_SIZE; i++) {
    bpmSamples[i] = 70;
  }
  
  pinMode(PULSE_PIN, INPUT);
  
  // Connect Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Configure NTP
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  // Wait for time to sync
  Serial.print("Syncing NTP time");
  struct tm timeinfo;
  int attempts = 0;
  while (!getLocalTime(&timeinfo) && attempts < 20) {
    Serial.print(".");
    delay(1000);
    attempts++;
  }
  Serial.println();
  
  if (attempts < 20) {
    Serial.println("NTP synced!");
    setRTCTimeFromNTP();
  } else {
    Serial.println("NTP sync failed, using existing RTC time");
  }
  
  // Initial readings
  currentTemperature = readTemperatureNTC();
  currentBPM = readBPM();
  currentTempStatus = getTemperatureStatus(currentTemperature);
  currentBPMStatus = getBPMStatus(currentBPM);
  lastSentTemperature = currentTemperature;
  lastSentBPM = currentBPM;
  lastSentTempStatus = currentTempStatus;
  lastSentBPMStatus = currentBPMStatus;
  
  // Ready message
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("System Ready!");
  display.setCursor(0, 10);
  display.println("Monitoring...");
  display.display();
  delay(2000);
  
  Serial.println("System initialized!");
  Serial.println("Status thresholds (stored in Firebase only):");
  Serial.println("  Temperature: <36°C=low, 36-37.5°C=normal, >37.5°C=high, >38°C=fever");
  Serial.println("  BPM: <60=low, 60-100=normal, >100=high");
}

// --------------------------------------
void loop() {
  unsigned long currentMillis = millis();
  RtcDateTime currentTime = rtc.GetDateTime();
  
  // Sync RTC periodically
  if (currentMillis - lastRTCSync >= RTC_SYNC_INTERVAL) {
    lastRTCSync = currentMillis;
    if (WiFi.status() == WL_CONNECTED) {
      setRTCTimeFromNTP();
    }
  }
  
  // Read sensors
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = currentMillis;
    currentBPM = readBPM();
    currentTemperature = readTemperatureNTC();
    
    // Update statuses (for Firebase only)
    currentBPMStatus = getBPMStatus(currentBPM);
    currentTempStatus = getTemperatureStatus(currentTemperature);
  }
  
  // Update OLED (without status)
  if (currentMillis - lastDisplayUpdate >= DISPLAY_UPDATE_INTERVAL) {
    lastDisplayUpdate = currentMillis;
    updateDisplay(currentTime);
  }
  
  // Send to Firebase (with time and status)
  if (currentMillis - lastFirebaseSend >= FIREBASE_SEND_INTERVAL) {
    lastFirebaseSend = currentMillis;
    sendToFirebase(currentTime, currentBPM, currentTemperature, currentBPMStatus, currentTempStatus);
  }
}