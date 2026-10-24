import { repl } from '@nestjs/core';
import { PlaygroundModule } from './playground.module';

async function bootstrap() {
  await repl(PlaygroundModule);
}
void bootstrap();
