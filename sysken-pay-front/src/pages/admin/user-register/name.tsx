import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { CompletionModal } from "../../../components/ui/CompletionModal";
import Header from "../../../components/layouts/Header";
import ArrowButton from "../../../components/ui/ArrowButton";

export default function UserRegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleRegister = () => {
    if (!name.trim()) return;
    setShowModal(true);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="ユーザー登録" />

      <div className="flex-1 flex flex-col items-center justify-start pt-[18vh]">
        <div className="flex flex-col gap-3">
          <Input
            label="名前"
            placeholder="シス研太郎"
            value={name}
            onChange={setName}
          />
        </div>
      </div>

      <div className="flex justify-center mb-[4vh]">
        <Button size="md" onClick={handleRegister}>
          登録
        </Button>
      </div>
      <ArrowButton
        variant="prev"
        onClick={() => navigate("/admin/user-register")}
      >
        戻る
      </ArrowButton>

      {showModal && (
        <CompletionModal
          mode={"userRegister"}
          name={name}
          onClose={() => navigate("/admin/menu")}
        />
      )}
    </div>
  );
}
