import { load } from 'cheerio';

import { config } from '@/config';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const processDetail = (data: string) => {
    const $ = load(data);
    const content = $('.bbscontent').html()?.trim() || '';
    const time = $('.DateAndTime').first().text().trim();
    return {
        description: content,
        pubDate: time ? parseDate(time, 'YYYY-MM-DD HH:mm') : undefined,
    };
};

export const handler = async (ctx) => {
    const cookie = config.yaohuo.cookie;

    const rootUrl = 'https://yaohuo.me';
    const currentUrl = new URL('bbs/book_list.aspx?action=new', rootUrl).href;

    const defaultHeaders = {
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        Referer: rootUrl,
    };

    const response = await ofetch(currentUrl, {
        headers: defaultHeaders,
    });

    const html = typeof response === 'string' ? response : String(response);
    const $ = load(html);
    const list = $('body > .listdata').toArray();

    if (list.length === 0) {
        ctx.set('json', {
            debug: 'no .listdata found',
            cookie_configured: !!cookie,
            response_type: typeof response,
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
                headers: defaultHeaders,
            });
            const detail = processDetail(detailResponse as string);
            return {
                title,
                link,
                description: detail.description,
                pubDate: detail.pubDate,
            };
        });

        items.push(cached);
        // eslint-disable-next-line no-await-in-loop
        await delay(300);
    }

    return {
        title: '妖火 - 最新帖子',
        link: rootUrl,
        item: items,
        allowEmpty: true,
    };
};

export const route: Route = {
    path: '/',
    name: '最新帖子',
    url: 'yaohuo.me',
    maintainers: ['RSSHub'],
    handler,
    example: '/yaohuo',
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
