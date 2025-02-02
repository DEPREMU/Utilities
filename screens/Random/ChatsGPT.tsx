import {
  getAllData,
  updateColumns,
} from "../../utils/database/dataBaseConnection";
import {
  View,
  Text,
  Alert,
  Pressable,
  TextInput,
  ScrollView,
  BackHandler,
} from "react-native";
import Chats from "../../components/ChatsGPT/Chats";
import stylesChatsGPT from "../../styles/random/stylesChatsGPT";
import { insertInTable } from "../../utils/globalVariables/utils";
import { useFocusEffect } from "@react-navigation/native";
import { useEffect, useState } from "react";

interface ChatsGPTProps {
  navigation: any;
}

const ChatsGPT: React.FC<ChatsGPTProps> = ({ navigation }) => {
  const tableName = "ChatsGPT";
  const [chats, setChats] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [boolShowHidden, setBoolShowHidden] = useState<boolean>(false);

  const newChat = async () => {
    const date = new Date().toString();
    const error = insertInTable(tableName, {
      date: date,
      type: type,
      description: description,
    });
    if (error) console.error(error);

    const { data: chats } = await getAllData(tableName);
    if (chats) setChats(JSON.stringify(chats.reverse() || {}));
    setDescription("");
    setType("");
  };

  const notShowChat = async (id: number) => {
    await updateColumns(tableName, { show: false }, "id", id);
    const { data: chats } = await getAllData(tableName);
    if (chats) setChats(JSON.stringify(chats.reverse() || {}));
  };

  const showChat = async (id: number) => {
    await updateColumns(tableName, { show: true }, "id", id);
    const { data: chats } = await getAllData(tableName);
    if (chats) setChats(JSON.stringify(chats.reverse() || {}));
  };

  useEffect(() => {
    const getChats = async () => {
      const { data: chats } = await getAllData("ChatsGPT");
      if (chats) setChats(JSON.stringify(chats.reverse() || {}));
    };

    getChats();
  }, []);

  useFocusEffect(() => {
    const onBackPress = () => {
      Alert.alert("Back", "Do you want to back to the menu selector?", [
        {
          text: "No",
          onPress: () => null,
        },
        {
          text: "Yes",
          onPress: () => navigation.replace("Start"),
        },
      ]);

      return true;
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () =>
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
  });

  return (
    <View style={stylesChatsGPT.container}>
      <Pressable
        style={({ pressed }) => [
          stylesChatsGPT.buttonNewChat,
          { opacity: pressed ? 0.5 : 1 },
        ]}
        onPress={() => setBoolShowHidden((prev) => !prev)}
      >
        <Text style={stylesChatsGPT.textButtons}>
          {boolShowHidden ? "Hide all chats hidden" : "Show all chats"}
        </Text>
      </Pressable>
      <View style={stylesChatsGPT.formNewChat}>
        <Text style={stylesChatsGPT.textType}>New Chat</Text>

        <TextInput
          style={stylesChatsGPT.textInput}
          onChangeText={setType}
          value={type}
          placeholder="Question"
        />
        <TextInput
          style={stylesChatsGPT.textInput}
          onChangeText={setDescription}
          value={description}
          placeholder="Chat"
        />

        <Pressable
          style={({ pressed }) => [
            stylesChatsGPT.buttonNewChat,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          onPress={async () => await newChat()}
        >
          <Text style={stylesChatsGPT.textButtons}>Add new chat</Text>
        </Pressable>
      </View>
      <ScrollView style={stylesChatsGPT.containerScrollView}>
        {chats != null && (
          <Chats
            chats={chats}
            showChat={showChat}
            notShowChat={notShowChat}
            boolShowAll={boolShowHidden}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default ChatsGPT;
