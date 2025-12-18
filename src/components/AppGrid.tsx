import { Link } from "react-router-dom";
import {
  Crown,
  Star,
  Package,
  ShoppingBag,
  Truck,
  LayoutDashboard,
  ClipboardList,
  Keyboard,
  Building2,
} from "lucide-react";
import AppIcon from "./AppIcon";

const apps = [
  { icon: Crown, label: "Premium Entry", colorClass: "app-icon-yellow", path: "/premium-entry" },
  { icon: Star, label: "Rating Entry", colorClass: "app-icon-orange", path: "/rating-entry" },
  { icon: Package, label: "Stock Entry", colorClass: "app-icon-blue", path: "/stock-entry" },
  { icon: ShoppingBag, label: "Product Entry", colorClass: "app-icon-purple", path: "/product-entry" },
  { icon: Truck, label: "Delivery Screen", colorClass: "app-icon-green", path: "/delivery-screen" },
  { icon: LayoutDashboard, label: "Overview", colorClass: "app-icon-cyan", path: "/overview" },
  { icon: ClipboardList, label: "Order Management", colorClass: "app-icon-pink", path: "/order-management" },
  { icon: Keyboard, label: "Keyboard Entry", colorClass: "app-icon-indigo", path: "/keyboard-entry" },
  { icon: Building2, label: "Back Office", colorClass: "app-icon-teal", path: "/back-office" },
];

const AppGrid = () => {
  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 sm:gap-8 md:gap-10">
        {apps.map((app, index) => (
          <Link to={app.path} key={app.label}>
            <AppIcon
              icon={app.icon}
              label={app.label}
              colorClass={app.colorClass}
              delay={150 + index * 50}
            />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AppGrid;
