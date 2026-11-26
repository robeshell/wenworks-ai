import { redirect } from "next/navigation";

// Intake moved into the inbox's capture box.
export default function CuratorIngestPage() {
  redirect("/curator/");
}
