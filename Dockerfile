FROM node:latest

RUN mkdir -p /usr/dev/hornet-web/
WORKDIR /usr/dev/hornet-web/

RUN curl -fsSL https://bun.sh/install | bash && ln -s $HOME/.bun/bin/bun /usr/local/bin/bun

COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install

COPY . .

ENTRYPOINT [ "bun", "--bun", "next", "dev"]
