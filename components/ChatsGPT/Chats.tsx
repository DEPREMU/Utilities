import React from "react";
import { View, Text, Pressable } from "react-native";
import stylesChatsGPT from "../../styles/random/stylesChatsGPT";

interface ChatsProps {
  boolShowAll: boolean;
  chats: string;
  notShowChat: (id: number) => void;
  showChat: (id: number) => void;
}

interface tableChats {
  id: number;
  date: string;
  type: string;
  description: string;
  show: boolean;
}

const Chats: React.FC<ChatsProps> = ({
  boolShowAll,
  chats,
  notShowChat,
  showChat,
}) =>
  JSON.parse(chats).map((value: tableChats) => {
    const date = new Date(value.date).toLocaleString();

    if (value.show || boolShowAll)
      return (
        <View key={value.id} style={stylesChatsGPT.containerChat}>
          <Text style={stylesChatsGPT.textType}>
            {date + "\n"}
            {value.type}
          </Text>
          <Text style={stylesChatsGPT.textDescription}>
            {value.description}
          </Text>
          <Pressable
            style={({ pressed }) => [
              stylesChatsGPT.buttonNotShowChat,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            onPress={() =>
              value.show ? notShowChat(value.id) : showChat(value.id)
            }
          >
            <Text style={stylesChatsGPT.textButtons}>
              {value.show ? "Hide chat" : "Show chat"}
            </Text>
          </Pressable>
        </View>
      );
  });

export default Chats;
