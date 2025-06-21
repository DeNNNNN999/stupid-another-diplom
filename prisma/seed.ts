import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...');

  // Создаем админа
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@taxservice.ru' },
    update: {},
    create: {
      email: 'admin@taxservice.ru',
      name: 'Администратор Системы',
      password: adminPassword,
      role: 'ADMIN',
      department: 'IT отдел',
      position: 'Системный администратор',
      phoneNumber: '+7 (900) 123-45-67',
    },
  });

  console.log('✅ Создан администратор:', admin.email);

  // Создаем тестовых пользователей
  const testUsers = [
    {
      email: 'ivanov@taxservice.ru',
      name: 'Иванов Иван Иванович',
      department: 'Отдел камеральных проверок',
      position: 'Главный специалист',
      phoneNumber: '+7 (900) 111-11-11',
    },
    {
      email: 'petrov@taxservice.ru',
      name: 'Петров Петр Петрович',
      department: 'Отдел выездных проверок',
      position: 'Ведущий инспектор',
      phoneNumber: '+7 (900) 222-22-22',
    },
    {
      email: 'sidorova@taxservice.ru',
      name: 'Сидорова Анна Сергеевна',
      department: 'Юридический отдел',
      position: 'Юрист',
      phoneNumber: '+7 (900) 333-33-33',
    },
    {
      email: 'nikolaev@taxservice.ru',
      name: 'Николаев Николай Николаевич',
      department: 'Отдел регистрации и учета',
      position: 'Начальник отдела',
      phoneNumber: '+7 (900) 444-44-44',
    },
  ];

  const userPassword = await bcrypt.hash('user123', 10);
  const users = [];

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password: userPassword,
        role: 'EMPLOYEE',
      },
    });
    users.push(user);
    console.log('✅ Создан пользователь:', user.email);
  }

  // Создаем коды доступа
  const accessCodes = [
    {
      code: 'WELCOME2024',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
      createdBy: admin.id,
    },
    {
      code: 'NEWEMPLOYEE',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 дней
      createdBy: admin.id,
    },
  ];

  for (const codeData of accessCodes) {
    await prisma.accessCode.upsert({
      where: { code: codeData.code },
      update: {},
      create: codeData,
    });
    console.log('✅ Создан код доступа:', codeData.code);
  }

  // Создаем новости
  const newsItems = [];
  const newsData = [
    {
      title: 'Изменения в налоговом законодательстве с 1 января 2024',
      content: `С 1 января 2024 года вступают в силу важные изменения в налоговом законодательстве:

1. Увеличение лимита доходов для применения УСН
2. Новые правила расчета имущественных налогов
3. Изменения в порядке представления налоговой отчетности

Всем сотрудникам необходимо ознакомиться с изменениями и пройти соответствующее обучение.`,
      category: 'Законодательство',
      importance: 'HIGH',
      authorId: admin.id,
    },
    {
      title: 'График работы в праздничные дни',
      content: `Уважаемые коллеги!

Информируем вас о графике работы налоговой службы в праздничные дни:

31 декабря - сокращенный день до 16:00
1-8 января - выходные дни
9 января - начало работы в обычном режиме

Дежурная служба будет работать по особому графику.`,
      category: 'Организационные вопросы',
      importance: 'NORMAL',
      authorId: admin.id,
    },
    {
      title: 'Внедрение новой системы электронного документооборота',
      content: `В рамках цифровизации налоговой службы начинается поэтапное внедрение новой системы электронного документооборота.

Преимущества новой системы:
- Ускорение обработки документов
- Автоматизация рутинных операций
- Улучшенная система поиска и архивирования

Обучение сотрудников начнется с 15 декабря.`,
      category: 'Технологии',
      importance: 'NORMAL',
      authorId: users[3].id,
    },
  ];

  for (const data of newsData) {
    const news = await prisma.news.create({
      data: data,
    });
    newsItems.push(news);
    console.log('✅ Создана новость:', news.title);
  }

  // Создаем групповой чат
  const groupChat = await prisma.chatRoom.create({
    data: {
      name: 'Общий чат отдела',
      isGroup: true,
      users: {
        create: [
          { userId: admin.id, isAdmin: true },
          ...users.map(user => ({ userId: user.id, isAdmin: false })),
        ],
      },
    },
  });

  console.log('✅ Создан групповой чат:', groupChat.name);

  // Создаем приветственные сообщения
  await prisma.message.create({
    data: {
      content: 'Добро пожаловать в общий чат отдела! Здесь мы обсуждаем рабочие вопросы и делимся важной информацией.',
      senderId: admin.id,
      chatRoomId: groupChat.id,
    },
  });

  // Создаем личный чат между двумя пользователями
  const privateChat = await prisma.chatRoom.create({
    data: {
      isGroup: false,
      users: {
        create: [
          { userId: users[0].id },
          { userId: users[1].id },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      content: 'Привет! Не забудь отправить отчет по проверке ООО "Ромашка" до конца дня.',
      senderId: users[1].id,
      chatRoomId: privateChat.id,
    },
  });

  console.log('✅ Созданы тестовые чаты и сообщения');

  // Создаем уведомления
  for (const user of users) {
    await prisma.notification.create({
      data: {
        title: 'Добро пожаловать!',
        content: 'Добро пожаловать в систему внутренней коммуникации налоговой службы. Ознакомьтесь с инструкцией по использованию.',
        type: 'SYSTEM',
        userId: user.id,
      },
    });
  }

  console.log('✅ Созданы приветственные уведомления');

  // Создаем тестовые документы
  const documents = [
    {
      title: 'Инструкция по работе с системой',
      description: 'Подробное руководство пользователя',
      filename: 'instruction.pdf',
      fileUrl: '/uploads/instruction.pdf',
      fileSize: 2048576,
      fileType: 'application/pdf',
      category: 'Инструкции',
      uploaderId: admin.id,
    },
    {
      title: 'Отчет по камеральным проверкам за Q4 2023',
      description: 'Квартальный отчет отдела',
      filename: 'report_q4_2023.xlsx',
      fileUrl: '/uploads/report_q4_2023.xlsx',
      fileSize: 524288,
      fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      category: 'Отчеты',
      uploaderId: users[0].id,
    },
    {
      title: 'Презентация новой системы ЭДО',
      description: 'Материалы для обучения сотрудников',
      filename: 'edo_presentation.pptx',
      fileUrl: '/uploads/edo_presentation.pptx',
      fileSize: 10485760,
      fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      category: 'Презентации',
      uploaderId: users[3].id,
    },
  ];

  for (const docData of documents) {
    const doc = await prisma.document.create({
      data: docData,
    });
    console.log('✅ Создан документ:', doc.title);
  }

  // Создаем конференции
  const conferences = [
    {
      title: 'Планерка отдела камеральных проверок',
      description: 'Еженедельная планерка',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // через 2 часа
      endTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000), // длительность 30 минут
      isActive: false,
    },
    {
      title: 'Обучение: Изменения в НК РФ',
      description: 'Вебинар по изменениям в налоговом кодексе',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // завтра
      endTime: new Date(Date.now() + 26 * 60 * 60 * 1000), // длительность 2 часа
      isActive: false,
    },
    {
      title: 'Экстренное совещание',
      description: 'Обсуждение текущих вопросов',
      startTime: new Date(Date.now() - 60 * 60 * 1000), // час назад
      isActive: true, // активная конференция
    },
  ];

  for (const confData of conferences) {
    const conference = await prisma.conference.create({
      data: {
        ...confData,
        participants: {
          create: [
            { userId: admin.id, isHost: true },
            ...users.slice(0, 2).map(user => ({ userId: user.id, isHost: false })),
          ],
        },
      },
    });
    console.log('✅ Создана конференция:', conference.title);
  }

  // Добавляем больше сообщений для демонстрации активности
  const moreMessages = [
    {
      content: 'Коллеги, прошу всех ознакомиться с новой инструкцией в разделе документов.',
      senderId: admin.id,
      chatRoomId: groupChat.id,
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 минут назад
    },
    {
      content: 'Напоминаю о планерке в 10:00. Подготовьте отчеты по текущим проверкам.',
      senderId: users[3].id,
      chatRoomId: groupChat.id,
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 минут назад
    },
    {
      content: 'Отчет отправлен на вашу почту. Проверьте, пожалуйста.',
      senderId: users[0].id,
      recipientId: users[1].id,
      chatRoomId: privateChat.id,
      createdAt: new Date(Date.now() - 60 * 60 * 1000), // час назад
    },
  ];

  for (const msgData of moreMessages) {
    await prisma.message.create({
      data: msgData,
    });
  }

  console.log('✅ Созданы дополнительные сообщения');

  // Создаем комментарии к новостям
  if (newsItems.length > 0) {
    await prisma.comment.create({
      data: {
        content: 'Спасибо за информацию! Когда планируется обучение по новым изменениям?',
        authorId: users[0].id,
        newsId: newsItems[0].id,
      },
    });
    
    if (newsItems.length > 2) {
      await prisma.comment.create({
        data: {
          content: 'Очень актуальная информация. Будет ли запись вебинара?',
          authorId: users[1].id,
          newsId: newsItems[2].id,
        },
      });
    }
  }

  console.log('✅ Созданы комментарии к новостям');

  console.log('🎉 База данных успешно заполнена начальными данными!');
  console.log('\n📝 Данные для входа:');
  console.log('Администратор: admin@taxservice.ru / admin123');
  console.log('Пользователи: ivanov@taxservice.ru (и другие) / user123');
  console.log('Коды доступа для регистрации: WELCOME2024, NEWEMPLOYEE');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
