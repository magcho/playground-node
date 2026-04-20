import {
  getTestEnv,
  initializeTestEnvironment,
} from "../rules/firestore/utils";
import { messageTest } from "./collecctions/message";
import { usersTest } from "./collecctions/user";

describe("firestore.rules", () => {
  beforeAll(async () => {
    await initializeTestEnvironment(
      "testable-firebase-sample-chat-firestore-rules-test"
    );
  });

  afterAll(async () => {
    await getTestEnv().cleanup();
  });

  afterEach(async () => {
    await getTestEnv().clearFirestore();
  });

  usersTest();
  messageTest();
});
