import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const WhatsAppButton = () => {
  const handleWhatsAppClick = () => {
    const phoneNumber = "916375526458"; // Format: country code + number without +
    const message = encodeURIComponent("Hello! I'm interested in your dairy products.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  return (
    <Button
      onClick={handleWhatsAppClick}
      size="lg"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform md:h-auto md:w-auto md:rounded-lg md:px-6"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="hidden md:inline ml-2">Chat on WhatsApp</span>
    </Button>
  );
};

export default WhatsAppButton;
