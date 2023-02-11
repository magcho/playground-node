import { userFactory } from "../../factory/user";
import { getTestEnv, setCollection } from "../../rules/firestore/utils";
import firebase from "firebase/compat/app";

import {
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const user = userFactory.build({ id: "user-id" });
const other = userFactory.build({ id: "ohter-id" });
const users = [user, other];

export const usersTest = () => {
  let env: RulesTestEnvironment;

  beforeEach(async () => {
    env = getTestEnv();
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setCollection(adminDb.collection("users"), users);
    });
  });

  describe("認証済みの場合", () => {
    describe("自分のデータの場合", () => {
      let db: firebase.firestore.Firestore;

      beforeEach(() => {
        db = env.authenticatedContext(user.id).firestore();
      });

      it("読み込みできる", async () => {
        const ref = db.collection("users").doc("user.di");
        await assertSucceeds(ref.get());
      });
    });
  });
};
