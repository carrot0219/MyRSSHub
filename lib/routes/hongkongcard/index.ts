import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const handler = async () => {
    const url = 'https://www.hongkongcard.com/vue/forum/threads?category_id=100&filter=latest';

    const response = await ofetch(url, {
        headers: {
            Accept: 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
    });

    const data = (response as any).data;

    const items = data.map((item: any) => {
        const category = item.category ? item.category.name : '未分类';
        const tags = item.tags && item.tags.length > 0 ? item.tags.map((tag: any) => tag.name).join(', ') : '无标签';

        const description = `
            <p>${item.content || '无内容'}</p>
            <p>分类: ${category}</p>
            <p>标签: ${tags}</p>
            <p>浏览: ${item.total_views} | 回复: ${item.total_replies}</p>
            <p>最后回复: ${item.last_reply_before} by ${item.last_reply_user.nickname}</p>
        `;

        return {
            title: item.title,
            link: `https://www.hongkongcard.com/forum/show/${item.id}`,
            pubDate: parseDate(item.created_at),
            author: item.user.nickname,
            description,
            category,
        };
    });

    return {
        title: '香港卡论坛 - 最新帖子',
        link: 'https://www.hongkongcard.com/forum',
        item: items,
    };
};

export const route: Route = {
    path: '/',
    name: '最新帖子',
    url: 'www.hongkongcard.com',
    maintainers: ['RSSHub'],
    handler,
    example: '/hongkongcard',
    parameters: {},
    categories: ['bbs'],
    features: {
        requireConfig: [],
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
};
