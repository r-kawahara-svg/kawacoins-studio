import { isBypassEnabled } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  // バイパス有効時は proxy.ts が / に転送するが、念のため server side でも弾く
  if (isBypassEnabled()) {
    redirect("/");
  }
  return <LoginForm />;
}
