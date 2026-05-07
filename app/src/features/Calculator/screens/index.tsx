import Finances from "./finances";
import Calculator from "./calculator";
import { Screens } from "@types";
import TimeToDownload from "./timeToDownload";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";

const CalculatorNavigator = GetBottomNavigation<Screens["Calculator"]>([
  {
    key: "Calculator",
    title: "calculator",
    component: Calculator,
    focusedIcon: "calculator",
  },
  {
    key: "TimeToDownload",
    title: "calculator.timeToDownload.title",
    component: TimeToDownload,
    focusedIcon: "download",
  },
  {
    key: "Finances",
    title: "calculator.finances.title",
    component: Finances,
    focusedIcon: "finance",
  },
]);

export default CalculatorNavigator;
