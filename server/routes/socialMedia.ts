import type {
  RequestAddStreamer,
  RequestGetIsLiveStreamer,
  ResponseAddStreamer,
  ResponseGetIsLiveStreamer,
} from "./../../types/index";
import axios from "axios";
import express from "express";
import { supabase } from "./../supabase/supabase.ts";

const getLinkImageStreamer = async (streamer: string) => {
  streamer = streamer.toLowerCase().replace(/\s+/g, "");
  const { data } = await axios.get(`https://www.twitch.tv/${streamer}`);
  if (!data) return;
  const imageElement = data
    .split(">")
    .find((e: string) => e.includes("og:image"));

  if (!imageElement) return;
  const image = imageElement
    .split(" ")
    .find((e: string) => e.includes("content="))
    // eslint-disable-next-line quotes
    .split('"')[1];

  return image;
};

const isLiveStreamer = async (streamer: string): Promise<boolean> => {
  if (!streamer) return false;
  streamer = streamer.toLowerCase().replace(/\s/g, "");
  const { data }: { data: string } = await axios.get(
    `https://www.twitch.tv/${streamer}`,
  );

  const script = data
    .split(">")
    .find((e: string) => e.includes("isLiveBroadcast"));
  if (!script) return false;

  const json = JSON.parse(script.replace("</script", ""));
  console.log(JSON.stringify({ json }, null, 2));
  console.log(JSON.stringify({ script }, null, 2));
  const isLive: boolean =
    json?.["@graph"]?.[0]?.publication?.isLiveBroadcast || false;
  return isLive;
};

export const getIsLiveStreamer = async (
  req: express.Request<unknown, unknown, RequestGetIsLiveStreamer>,
  res: express.Response<ResponseGetIsLiveStreamer>,
) => {
  const { streamer } = req.body || { streamer: null };
  console.log(streamer);
  if (!streamer) {
    res.status(400).json({ error: "Streamer name is required" });
    return;
  }

  const isLive = await isLiveStreamer(streamer.name);
  res.status(200).json({ streamer: { ...streamer, isLive } });
};

export const addStreamer = async (
  req: express.Request<unknown, unknown, RequestAddStreamer>,
  res: express.Response<ResponseAddStreamer>,
) => {
  const { name, userId } = req.body || { name: "", userId: "" };

  if (!name || !userId) {
    res.status(400).json({ error: "Streamer name and User ID are required" });
    return;
  }
  try {
    const { data, error } = await supabase
      .from("Streamers")
      .insert({
        name,
        userId,
        linkImage: await getLinkImageStreamer(name),
      })
      .select()
      .single();

    const streamer = data
      ? { ...data, isLive: await isLiveStreamer(data.name) }
      : null;

    if (error) {
      res.status(500).json({ error: "Failed to add streamer" });
      return;
    }
    res.status(201).json({ streamer, success: true });
  } catch (error) {
    res.status(500).json({ error: `Unexpected error: ${error}` });
    return;
  }
};
