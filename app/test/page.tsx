'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Тестовая страница</h1>
        <p className="mb-4">Если вы видите эту страницу, базовая конфигурация работает!</p>
        <Link href="/login">
          <Button>Перейти к входу</Button>
        </Link>
      </div>
    </div>
  );
}
