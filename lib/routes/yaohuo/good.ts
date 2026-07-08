import { load } from 'cheerio';

import { config } from '@/config';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const processFeed = (data: string) => {
    const $ = load(data);
    const content = $('.bbscontent').html()?.trim() || '';
    const time = $('.DateAndTime').first().text().trim();
    return {
        desc: content,
        publish_time: time ? parseDate(time, 'YYYY-MM-DD HH:mm') : undefined,
    };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const handler = async (ctx) => {
    const cookie = config.yaohuo.cookie;

    const rootUrl = 'https://yaohuo.me';
    const currentUrl = new URL('bbs/book_list.aspx?action=good&classid=0&siteid=1000', rootUrl).href;

    const response = await ofetch(currentUrl, {
        headers: {
            Cookie: cookie,
        },
    });

    const html = typeof response === 'string' ? response : String(response);
    const $ = load(html);
    const list = $('body > .listdata').toArray().slice(0, 5);

    if (list.length === 0) {
        ctx.set('json', {
            debug: 'no .listdata found in /good',
            cookie_configured: !!cookie,
            response_preview: html.slice(0, 500),
        });
    }

    const items: DataItem[] = [];
    for (const item of list) {
        const $item = $(item);
        const firstTopicLink = $item.find('.topic-link').first();
        const title = firstTopicLink.text().trim();
        const link = new URL(firstTopicLink.attr('href') || '', rootUrl).href;

        // eslint-disable-next-line no-await-in-loop
        const cached = await cache.tryGet(link, async () => {
            const detailResponse = await ofetch(link, {
                headers: {
                    Cookie: cookie,
                },
            });
            const feed = processFeed(detailResponse as string);
            return {
                title,
                description: feed.desc,
                link,
                pubDate: feed.publish_time,
            };
        });

        items.push(cached);
        // eslint-disable-next-line no-await-in-loop
        await delay(300);
    }

    return {
        title: '妖火 - 精华帖子',
        link: rootUrl,
        item: items,
        allowEmpty: true,
    };
};

export const route: Route = {
    path: '/good',
    name: '精华帖子',
    url: 'yaohuo.me',
    maintainers: ['RSSHub'],
    handler,
    example: '/yaohuo/good',
    parameters: {},
    categories: ['bbs'],
    features: {
        requireConfig: [
            {
                name: 'YAOHUO_COOKIE',
                optional: true,
                description: '妖火 Cookie，登录后获取',
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
};
