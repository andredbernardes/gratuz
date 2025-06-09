import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

export default function Login() {
  const navigate = useNavigate()

  function handleLogin() {
    // aqui você pode validar login antes
    navigate("/dashboard")
  }

  return (
    <Button className="w-full" onClick={handleLogin}>
      Entrar
    </Button>
  )
}
