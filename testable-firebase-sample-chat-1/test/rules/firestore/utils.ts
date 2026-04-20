import { readFileSync } from "fs";
import {
  initializeTestEnvironment as _initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { getConverter, WithId } from "@/lib/firebase";
import type { DocumentData } from "firebase/firestore";
import type firebase from "firebase/compat/app";

let testEnv: RulesTestEnvironment;

export const initializeTestEnvironment = async (projectId: string) => {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
  testEnv = await _initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf-8"),
    },
  });
};

export const getTestEnv = () => testEnv;

export const setCollection = <T extends DocumentData>(
  ref: firebase.firestore.CollectionReference,
  instances: WithId<T>[]
) =>
  Promise.all(
    instances.map((instance) =>
      ref.doc(instance.id).set(getConverter<T>().toFirestore(instance))
    )
  );
