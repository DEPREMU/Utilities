import Finances from "./finances";
import Calculator from "./calculator";
import { memoDeep } from "@utils";
import TimeToDownload from "./timeToDownload";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";

const CalculatorNavigator = GetBottomNavigation(
  [
    {
      key: "Calculator" as const,
      title: "calculator",
      focusedIcon: "calculator",
    },
    {
      key: "TimeToDownload" as const,
      title: "calculator.timeToDownload.title",
      focusedIcon: "download",
    },
    {
      key: "Finances" as const,
      title: "calculator.finances.title",
      focusedIcon: "finance",
    },
  ],
  {
    Finances,
    Calculator,
    TimeToDownload,
  },
);

export default memoDeep(CalculatorNavigator);
