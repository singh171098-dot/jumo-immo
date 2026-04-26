import { redirect } from "next/navigation";
import { auth } from "@/auth";
import EspaceAcheteurClient from "./EspaceAcheteurClient";

export default async function EspaceAcheteurPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return <EspaceAcheteurClient userName={session.user.name ?? "Acheteur"} />;
}
