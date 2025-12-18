import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BackButton = () => {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate("/")}
            className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="Go Back to Home"
        >
            <ArrowLeft size={24} />
        </button>
    );
};

export default BackButton;
