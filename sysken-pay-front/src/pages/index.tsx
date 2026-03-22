import Header from "../components/layouts/Header";
import { HomeButtons } from "../components/features/home/HomeButtons";

export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title="シス研Pay" right="setting" shadow={true} />

      <main className="flex flex-1 flex-col items-center justify-center gap-[48px] p-6">
        <HomeButtons />
      </main>
    </div>
  );
}
