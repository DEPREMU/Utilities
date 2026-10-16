import GetBottomNavigation, {
  Route,
} from "@components/BottomNavigator/components/GetBottomNavigation";
import { Screens } from "@types";
import { REPLACERS } from "@common";
import { SharedModeTab } from "@screens/WhatsAppStickers/screens/SharedModeTab";
import { PersonalModeTab } from "@screens/WhatsAppStickers/screens/PersonalModeTab";
import { StickerConfigForm } from "@screens/WhatsAppStickers/components/StickerConfigForm";

const routes: Route[] = [
  {
    key: "shared",
    title: "whatsappStickers.sharedMode",
    component: SharedModeTab,
    focusedIcon: "cloud",
    unfocusedIcon: "cloud-outline",
  },
  ...(REPLACERS.isWeb
    ? [
        {
          key: "personal",
          title: "whatsappStickers.personalMode" as const,
          component: PersonalModeTab,
          focusedIcon: "cellphone",
          unfocusedIcon: "cellphone-basic",
        },
        {
          key: "settings",
          title: "whatsappStickers.preferences" as const,
          component: StickerConfigForm,
          focusedIcon: "cog",
          unfocusedIcon: "cog-outline",
        },
      ]
    : []),
];

export const WhatsAppStickersScreen =
  GetBottomNavigation<Screens["WhatsAppStickers"]>(routes);

export default WhatsAppStickersScreen;
