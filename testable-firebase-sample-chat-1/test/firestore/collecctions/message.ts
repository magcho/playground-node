import { messageFactory } from "../../factory/message";
import { userFactory } from "../../factory/user";
import firebase from "firebase/compat/app";
import { getTestEnv, setCollection } from "../../rules/firestore/utils";
import {
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { async } from "@firebase/util";

const user = userFactory.build({ id: "user-id" });
const other = userFactory.build({ id: "other-id" });
const users = [user, other];

const userMessage = messageFactory.build({
  id: "user-message-id",
  senderId: user.id,
});
const otherMessage = messageFactory.build({
  id: "other-message-id",
  senderId: other.id,
});
const messages = [userMessage, otherMessage];

export const messageTest = () => {
  let env: RulesTestEnvironment;

  beforeEach(async () => {
    env = getTestEnv();
    env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setCollection(adminDb.collection("users"), users);
      await setCollection(adminDb.collection("messages"), messages);
    });
  });

  describe("未認証の場合", () => {
    let db: firebase.firestore.Firestore;

    beforeEach(() => {
      db = env.unauthenticatedContext().firestore();
    });

    it("読み込みできない(get)", async () => {
      const ref = db.collection("messages").doc(otherMessage.id);
      await assertFails(ref.get());
    });

    it("読み込みできない(list)", async () => {
      const ref = db.collection("messages");
      await assertFails(ref.get());
    });

    it("作成できない", async () => {
      const newMessage = messageFactory.build();
      const ref = db.collection("messages");
      await assertFails(ref.add(newMessage));
    });

    it("更新できない", async () => {
      const ref = db.collection("messages").doc(otherMessage.id);
      await assertFails(ref.update({ content: "違う内容" }));
    });

    it("削除できない", async () => {
      const ref = db.collection("messages").doc(otherMessage.id);
      await assertFails(ref.delete());
    });
  });

  describe("認証済みの場合", () => {
    let db: firebase.firestore.Firestore;

    beforeEach(() => {
      db = env.authenticatedContext(user.id).firestore();
    });

    describe("自分のデータの場合", () => {
      it("読み込みできる(get)", async () => {
        const ref = db.collection("messages").doc(userMessage.id);
        await assertSucceeds(ref.get());
      });

      it("作成できる", async () => {
        const newMessage = messageFactory.build({
          senderId: user.id,
        });
        const ref = db.collection("messages").doc(newMessage.id);
        await assertSucceeds(ref.set(newMessage));
      });

      it("更新できる", async () => {
        const ref = db.collection("messages").doc(userMessage.id);
        await assertSucceeds(ref.update({ content: "違う内容" }));
      });

      it("削除できる", async () => {
        const ref = db.collection("messages").doc(userMessage.id);
        await assertSucceeds(ref.delete());
      });
    });

    describe("自分以外のデータの場合", () => {
      it("読み込みできる(get)", async () => {
        const ref = db.collection("messages").doc(otherMessage.id);
        await assertSucceeds(ref.get());
      });

      it("作成できない", async () => {
        const newMessage = messageFactory.build({
          senderId: other.id,
        });
        const ref = db.collection("messages").doc(newMessage.id);
        await assertFails(ref.set(newMessage));
      });

      it("更新できない", async () => {
        const ref = db.collection("messages").doc(otherMessage.id);
        await assertFails(ref.update({ content: "違う内容" }));
      });

      it("削除できない", async () => {
        const ref = db.collection("messages").doc(otherMessage.id);
        await assertFails(ref.delete());
      });
    });
  });
};
