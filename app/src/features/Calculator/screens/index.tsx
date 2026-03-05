import Finances from "./finances";
import Calculator from "./calculator";
import { memoDeep } from "@utils";
import TimeToDownload from "./timeToDownload";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const CalculatorNavigator = GetBottomNavigation(
  [
    { key: "calculator", title: "calculator", focusedIcon: "calculator" },
    {
      key: "timeToDownload",
      title: "timeToDownload",
      focusedIcon: "download",
    },
    { key: "finances", title: "finances", focusedIcon: "finance" },
  ],
  {
    finances: Finances,
    calculator: Calculator,
    timeToDownload: TimeToDownload,
  },
);

export default memoDeep(CalculatorNavigator);
