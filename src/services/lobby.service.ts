import type { RedisClient } from "../config/redis.ts";

export class LobbyService {
  constructor(private redis: RedisClient) {}

  async enqueue(user: {uid: string, name: string, image: string}) {
    const inQueue = await this.redis.sIsMember("queue:ranked:members", user.uid);
    console.log('already in queue....', inQueue);
    
    if (inQueue) return;
    //queue:ranked is set

    const res = await this.redis.rPush("queue:ranked", user.uid);
    await this.redis.hSet(`user_meta:${user.uid}`, {
        name: user.name,
        image: user.image
    });
    
    console.log('pushed...', res);
    await this.redis.set(`lobby_timeout:${user.uid}`, "active", { EX: 15 });
    
    await this.redis.sAdd("queue:ranked:members", user.uid);
  }

  async dequeue(userId: string) {
    await this.redis.lRem("queue:ranked", 0, userId);
    await this.redis.sRem("queue:ranked:members", userId);
  }
}