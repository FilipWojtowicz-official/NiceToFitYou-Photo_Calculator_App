import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const cameraRef = useRef<CameraView>(null);

  // Stan przechowujący adres IP
  const [apiUrl, setApiUrl] = useState("http://192.168.1.236:11434");

  // Ładowanie zapisanego IP przy starcie
  useEffect(() => {
    const loadIp = async () => {
      const savedIp = await AsyncStorage.getItem("user_server_ip");
      if (savedIp) setApiUrl(savedIp);
    };
    loadIp();
  }, []);

  // Funkcja zapisu IP przy każdej zmianie tekstu
  const saveIp = async (text: string) => {
    setApiUrl(text);
    await AsyncStorage.setItem("user_server_ip", text);
  };

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Brak dostępu do aparatu.</Text>
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
        setResult("Błąd: " + err);
      }
    }
  };

  const analyzeImage = async (base64Image: string) => {
    setLoading(true);
    setResult("Gemma analizuje posiłek...");
    try {
      const res = await fetch(`${apiUrl}/api/generate`, {
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
      setResult(
        `Błąd połączenia z: ${apiUrl}\n\nUpewnij się, że laptop i telefon są w jednej sieci (Hotspot) i wpisałeś dobre IP.`,
      );
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Nowy Nagłówek z polem tekstowym na IP */}
      <View style={styles.header}>
        <View style={{ width: "100%" }}>
          <Text style={styles.title}>🥗 NiceToFitYou</Text>
          <Text style={styles.ipLabel}>Adres serwera AI:</Text>
          <TextInput
            style={styles.ipInput}
            value={apiUrl}
            onChangeText={saveIp}
            placeholder="http://192.168.43.10:11434"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
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
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 25,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f2f6",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 10,
  },
  ipLabel: {
    fontSize: 10,
    color: "#95a5a6",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  ipInput: {
    backgroundColor: "#f1f2f6",
    padding: 8,
    borderRadius: 8,
    fontSize: 14,
    color: "#27ae60",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#dcdde1",
  },
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
    fontSize: 15,
    color: "#34495e",
    textAlign: "center",
    lineHeight: 20,
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
});
