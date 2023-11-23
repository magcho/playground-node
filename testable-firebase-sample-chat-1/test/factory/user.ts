import { User } from "@/types/user";
import { Timestamp } from "firebase/firestore";
import { Factory } from "fishery";

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: sequence.toString(),
  createdAt: Timestamp.fromDate(new Date()),
  name: `テストユーザー${sequence}`,
  photoUrl: "",
}));
