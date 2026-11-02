import AsyncStorage from "@react-native-async-storage/async-storage";
import { MapDocument, normalizeMaps } from "../types/map";

export const STORAGE_KEY = "@lifemap/maps/v1";
export async function loadMaps(): Promise<MapDocument[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return normalizeMaps(JSON.parse(raw));
}
export async function saveMaps(maps: MapDocument[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
}
