import { serve } from "@hono/node-server";
import { EntrypointHeight } from "@devvit/reddit";
import { context, createServer, getServerPort, reddit } from "@devvit/web/server";
import type { MenuItemRequest, UiResponse } from "@devvit/web/shared";
import { Hono } from "hono";

const app = new Hono();

app.post("/internal/menu/create-sword-and-honor", async (request) => {
  await request.req.json<MenuItemRequest>();

  if (!context.subredditName) {
    return request.json<UiResponse>({
      showToast: "Open this action from a subreddit to create the game post.",
    });
  }

  try {
    const post = await reddit.submitCustomPost({
      subredditName: context.subredditName,
      title: "Sword and Honor: Rise to the Throne",
      entry: "default",
      textFallback: {
        text: "Open this post in Reddit to begin your Sword and Honor campaign.",
      },
      styles: {
        backgroundColor: "#171109FF",
        backgroundColorDark: "#171109FF",
        height: EntrypointHeight.TALL,
      },
    });

    return request.json<UiResponse>({ navigateTo: post });
  } catch (error) {
    console.error("Unable to create Sword and Honor post", error);
    return request.json<UiResponse>({
      showToast: "Could not create the game post. Please try again.",
    });
  }
});

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
