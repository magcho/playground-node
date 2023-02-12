import { userFactory } from "../../factory/user";
import { getTestEnv, setCollection } from "../../rules/firestore/utils";
import firebase from "firebase/compat/app";

import {
  assertFails,
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

      it("読み込みできる(get)", async () => {
        const ref = db.collection("users").doc(user.id);
        await assertSucceeds(ref.get());
      });

      it("作成できる", async () => {
        const newUser = userFactory.build();
        const db = env.authenticatedContext(newUser.id).firestore();
        const ref = db.collection("users");
        await assertSucceeds(ref.doc(newUser.id).set(newUser));
      });

      it("更新できる", async () => {
        const ref = db.collection("users").doc(user.id);
        await assertSucceeds(ref.update({ name: "違う名前" }));
      });

      it("削除できる", async () => {
        const ref = db.collection("users").doc(user.id);
        await assertSucceeds(ref.delete());
      });
    });

    describe("自分以外のデータの場合", () => {
      let db: firebase.firestore.Firestore;

      beforeEach(() => {
        db = env.authenticatedContext(user.id).firestore();
      });

      it("読み込みできる(get)", async () => {
        const ref = db.collection("users").doc(other.id);
        await assertSucceeds(ref.get());
      });

      it("作成できない", async () => {
        const newUser = userFactory.build();
        const ref = db.collection("users");
        await assertFails(ref.doc(newUser.id).set(newUser));
      });

      it("更新できない", async () => {
        const ref = db.collection("users").doc(other.id);
        await assertFails(ref.update({ name: "違う名前" }));
      });

      it("削除できない", async () => {
        const ref = db.collection("users").doc(other.id);
        await assertFails(ref.delete());
      });
    });
  });
};
