import Finances from "./finances";
import Calculator from "./calculator";
import { memoDeep } from "@utils";
import TimeToDownload from "./timeToDownload";
import GetBottomNavigation from "@components/common/GetBottomNavigation";

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
    calculator: Calculator,
    timeToDownload: TimeToDownload,
    finances: Finances,
  },
);

export default memoDeep(CalculatorNavigator);
