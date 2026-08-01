import * as ImagePicker from "expo-image-picker";

/* Prompt for photo-library permission and let the user pick one image.
   Returns a file object shaped for React Native's FormData
   ({ uri, name, type }) or null if cancelled/denied. */
export async function pickImageFile({ aspect } = {}) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { error: "Photo permission is needed." };

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], // SDK 54: array of MediaType strings
        allowsEditing: true,
        ...(aspect ? { aspect } : {}),
        quality: 0.8,
    });
    if (result.canceled) return null;

    const asset = result.assets[0];
    return {
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
    };
}
