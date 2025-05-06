import { BubbleDataType } from '@ant-design/x/es/bubble/BubbleList';
import { Conversation } from '@ant-design/x/es/conversations';
import { MessageInfo } from '@ant-design/x/es/use-x-chat';
import { load, Store } from '@tauri-apps/plugin-store';

class BaseStore<Value> {
    protected instance: Store | undefined;
    protected name: string;
    protected autoSave: number;

    constructor(name: string, autoSave: number = 1000) {
        this.name = name;
        this.autoSave = autoSave;
    }

    public async init() {
        this.instance = await load(`${this.name}.json`, { autoSave: this.autoSave });
    }

    public async set(key: string, value: Value) {
        if (!this.instance) {
            throw new Error('Store not initialized');
        }

        return await this.instance.set(key, value);
    }

    public async get(key: string): Promise<Value | undefined> {
        if (!this.instance) {
            throw new Error('Store not initialized');
        }

        return await this.instance.get<Value>(key);
    }

    public async entries(): Promise<[key: string, value: Value][]> {
        if (!this.instance) {
            throw new Error('Store not initialized');
        }

        return await this.instance.entries<Value>();
    }

    public async clear() {
        if (!this.instance) {
            throw new Error('Store not initialized');
        }

        return await this.instance.clear();
    }
}

export class ChatHistoryStore extends BaseStore<{
    session: Conversation;
    messages: MessageInfo<BubbleDataType>[];
}> {
    constructor() {
        super('chat-history', 1000);
    }
}
