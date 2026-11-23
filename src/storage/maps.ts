import AsyncStorage from "@react-native-async-storage/async-storage";
import { MapDocument, normalizeMaps } from "../types/map";

export const STORAGE_KEY = "@lifemap/maps/v1";

export async function loadMaps(): Promise<MapDocument[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return normalizeMaps(parsed);
  } catch (error) {
    console.error("Failed to load LifeMap data:", error);
    throw new Error(
      "Unable to load your saved maps. Your stored data has not been overwritten.",
    );
  }
}

export async function saveMaps(maps: MapDocument[]): Promise<void> {
  const normalizedMaps = normalizeMaps(maps);

  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalizedMaps),
    );
  } catch (error) {
    console.error("Failed to save LifeMap data:", error);
    throw new Error("Unable to save your maps. Please try again.");
  }
}