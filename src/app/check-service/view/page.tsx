import { redirect } from "next/navigation";

/** Old email links (before the code was introduced) now go to the Check Service page. */
export default function OldLink() {
  redirect("/check-service");
}
