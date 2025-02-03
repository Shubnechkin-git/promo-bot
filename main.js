require('dotenv').config()
const { VK, Keyboard } = require('vk-io');
const { HearManager } = require('@vk-io/hear');

const express = require('express')
const axios = require('axios');
const app = express()

app.get('/', function (req, res) {
    res.send('Что ты тут забыл? XD',)
})

app.listen(process.env.PORT)

// URL вашего сервера
const url = process.env.PROD_URL;

// Интервал пингования в миллисекундах (например, 1 минут)
const pingInterval = process.env.PING_INTERVAL * 60 * 1000;
// const pingInterval = 10 * 1000;

// Функция для пингования сервера 
function pingServer() {
    axios.get(url)
        .then(() => {
            const now = new Date();
            const offset = now.getTimezoneOffset() / 60; // Получаем смещение часового пояса в часах
            const gmtPlusFour = now.getTime() + (offset + 4) * 60 * 60 * 1000; // Добавляем смещение часового пояса к времени
            const pingTime = new Date(gmtPlusFour).toLocaleString(); // Преобразуем время в локальную строку даты и времени
            console.log(`Pinged server at ${pingTime}`);
        })
        .catch((err) => {
            console.error(`Error pinging server: ${err.message}`);
        });
}

// Пингуем сервер каждые pingInterval миллисекунд
setInterval(pingServer, pingInterval);
const vk = new VK({
    token: process.env.TOKEN 
});

const hearManager = new HearManager();

vk.updates.on('message_new', (context, next) => {
    const { messagePayload } = context;

    context.state.command = messagePayload && messagePayload.command
        ? messagePayload.command
        : null;

    return next();
});

vk.updates.on('message_new', hearManager.middleware);

// Simple wrapper for commands
const hearCommand = (name, conditions, handle) => {
    if (typeof handle !== 'function') {
        handle = conditions;
        conditions = [`/${name}`];
    }

    if (!Array.isArray(conditions)) {
        conditions = [conditions];
    }

    hearManager.hear(
        [
            (text, { state }) => (
                state.command === name
            ),
            ...conditions
        ],
        handle
    );
};

// Handle start button
hearCommand('start', (context, next) => {
    context.state.command = 'help';

    return Promise.all([
        context.send('Hello!'),

        next()
    ]);
});

hearCommand('help', async (context) => {
    await context.send({
        message: `
            My commands list

            /help - The help
            /time - The current date
            /cat - Cat photo
            /purr - Cat purring
        `,
        keyboard: Keyboard.builder()
            .textButton({
                label: 'The help',
                payload: {
                    command: 'help'
                }
            })
            .row()
            .textButton({
                label: 'The current date',
                payload: {
                    command: 'time'
                }
            })
            .row()
            .textButton({
                label: 'Cat photo',
                payload: {
                    command: 'cat'
                },
                color: Keyboard.PRIMARY_COLOR
            })
            .textButton({
                label: 'Cat purring',
                payload: {
                    command: 'purr'
                },
                color: Keyboard.PRIMARY_COLOR
            })
    });
});

hearCommand('cat', async (context) => {
    await Promise.all([
        context.send('Wait for the uploads awesome 😻'),

        context.sendPhotos({
            value: 'https://loremflickr.com/400/300/'
        })
    ]);
});

hearCommand('time', ['/time', '/date'], async (context) => {
    await context.send(String(new Date()));
});

const catsPurring = [
    'http://ronsen.org/purrfectsounds/purrs/trip.mp3',
    'http://ronsen.org/purrfectsounds/purrs/maja.mp3',
    'http://ronsen.org/purrfectsounds/purrs/chicken.mp3'
];

hearCommand('purr', async (context) => {
    const link = catsPurring[Math.floor(Math.random() * catsPurring.length)];

    await Promise.all([
        context.send('Wait for the uploads purring 😻'),

        context.sendAudioMessage({
            value: link
        })
    ]);
});

vk.updates.start().catch(console.error);