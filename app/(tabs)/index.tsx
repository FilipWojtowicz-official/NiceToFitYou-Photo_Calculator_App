import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ZMIEŃ TO NA SWOJE IP (z komendy ipconfig)
const IP_ADDRESS = "192.168.1.236";

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const cameraRef = useRef<CameraView>(null);

  // Automatyczna prośba o uprawnienia przy starcie
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // 1. Stan ładowania uprawnień
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 2. Obsługa braku uprawnień (z przyciskiem wymuszającym)
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            Aplikacja nie ma dostępu do aparatu.
          </Text>
          <Text style={styles.subErrorText}>
            Nawet jeśli nadałeś je w systemie, musisz potwierdzić je tutaj:
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>ODBLOKUJ APARAT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const options = { quality: 0.5, base64: true };
        const data = await cameraRef.current.takePictureAsync(options);
        if (data && data.uri) {
          setPhoto(data.uri);
          if (data.base64) {
            analyzeImage(data.base64);
          }
        }
      } catch (err) {
        setResult("Błąd przy robieniu zdjęcia: " + err);
      }
    }
  };

  const analyzeImage = async (base64Image: string) => {
    setLoading(true);
    setResult("Gemma 4 analizuje Twój posiłek...");
    try {
      const res = await fetch(`http://${IP_ADDRESS}:11434/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma4:e2b",
          prompt:
            "Identify the food in this image and estimate its total calories. Respond in Polish.",
          images: [base64Image],
          stream: false,
        }),
      });
      const data = await res.json();
      setResult(data.response);
    } catch (error: any) {
      setResult("Błąd połączenia z laptopem: " + error.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🥗NiceToFitYou - Photo Calculator</Text>
      </View>

      <View style={styles.cameraContainer}>
        {!photo ? (
          <CameraView style={styles.camera} ref={cameraRef} facing="back" />
        ) : (
          <Image source={{ uri: photo }} style={styles.camera} />
        )}
      </View>

      <View style={styles.resultArea}>
        {loading && (
          <ActivityIndicator
            size="small"
            color="#2ecc71"
            style={{ marginBottom: 10 }}
          />
        )}
        <Text style={styles.resultText}>
          {result || "Skieruj aparat na jedzenie"}
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.mainButton,
            { backgroundColor: photo ? "#e74c3c" : "#2ecc71" },
          ]}
          onPress={
            photo
              ? () => {
                  setPhoto(null);
                  setResult("");
                }
              : takePhoto
          }
        >
          <Text style={styles.buttonText}>
            {photo ? "USUŃ I PONÓW" : "SKANUJ I LICZ KALORIE"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfdfd" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#2c3e50" },
  cameraContainer: {
    flex: 2,
    margin: 15,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "#000",
    elevation: 5,
  },
  camera: { flex: 1 },
  resultArea: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: {
    fontSize: 16,
    color: "#34495e",
    textAlign: "center",
    lineHeight: 22,
  },
  footer: { paddingBottom: 30 },
  mainButton: {
    marginHorizontal: 30,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    elevation: 3,
  },
  permissionButton: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  errorText: { fontSize: 18, fontWeight: "bold", color: "#e74c3c" },
  subErrorText: { textAlign: "center", color: "#7f8c8d", marginTop: 10 },
});
