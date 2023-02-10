import { initializeApp } from "firebase/app";
import { omit } from "lodash-es";
import type {
  FirestoreDataConverter,
  DocumentData,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

initializeApp(firebaseConfig);

export type { Timestamp } from "firebase/firestore";
export type WithId<T> = T & { id: string };

export const getConverter = <T extends DocumentData>(): FirestoreDataConverter<
  WithId<T>
> => ({
  toFirestore: (data: PartialWithFieldValue<WithId<T>>): DocumentData => {
    return omit(data, ["id"]);
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot<T>,
    options: SnapshotOptions
  ): WithId<T> => {
    return { id: snapshot.id, ...snapshot.data(options) };
  },
});