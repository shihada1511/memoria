'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const password = await bcrypt.hash('Passw0rd!', 10);

    await queryInterface.bulkInsert('Admins', [{
      firstName: 'Site',
      lastName: 'Admin',
      email: 'admin@memoria.dev',
      password,
      createdAt: now,
      updatedAt: now
    }]);

    await queryInterface.bulkInsert('Users', [
      {
        firstName: 'Mohammed',
        lastName: 'Shihada',
        username: 'mshihada',
        email: 'mshihada@memoria.dev',
        password,
        role: 'user',
        theme: 'light',
        createdAt: now,
        updatedAt: now
      },
      {
        firstName: 'Sara',
        lastName: 'Khalil',
        username: 'sarak',
        email: 'sara@memoria.dev',
        password,
        role: 'manager',
        theme: 'dark',
        createdAt: now,
        updatedAt: now
      }
    ]);

    const [users] = await queryInterface.sequelize.query('SELECT id, username FROM Users');
    const userId = users.find(u => u.username === 'mshihada').id;

    await queryInterface.bulkInsert('Decks', [
      { title: 'JavaScript Basics', subject: 'Programming', userId, createdAt: now, updatedAt: now },
      { title: 'Spanish Vocabulary', subject: 'Languages', userId, createdAt: now, updatedAt: now }
    ]);

    const [decks] = await queryInterface.sequelize.query('SELECT id, title FROM Decks');
    const jsDeckId = decks.find(d => d.title === 'JavaScript Basics').id;
    const esDeckId = decks.find(d => d.title === 'Spanish Vocabulary').id;

    await queryInterface.bulkInsert('Cards', [
      { deckId: jsDeckId, question: 'What is a closure?', answer: 'A function that remembers its outer scope.', createdAt: now, updatedAt: now },
      { deckId: jsDeckId, question: 'What does ORM stand for?', answer: 'Object-Relational Mapping.', createdAt: now, updatedAt: now },
      { deckId: esDeckId, question: 'How do you say "hello"?', answer: 'Hola', createdAt: now, updatedAt: now }
    ]);

    await queryInterface.bulkInsert('Tags', [
      { name: 'beginner', createdAt: now, updatedAt: now },
      { name: 'exam-prep', createdAt: now, updatedAt: now }
    ]);

    const [tags] = await queryInterface.sequelize.query('SELECT id, name FROM Tags');
    const beginnerTagId = tags.find(t => t.name === 'beginner').id;
    const examTagId = tags.find(t => t.name === 'exam-prep').id;

    await queryInterface.bulkInsert('DeckTags', [
      { deckId: jsDeckId, tagId: beginnerTagId, createdAt: now, updatedAt: now },
      { deckId: jsDeckId, tagId: examTagId, createdAt: now, updatedAt: now },
      { deckId: esDeckId, tagId: beginnerTagId, createdAt: now, updatedAt: now }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('DeckTags', null, {});
    await queryInterface.bulkDelete('Tags', null, {});
    await queryInterface.bulkDelete('Cards', null, {});
    await queryInterface.bulkDelete('Decks', null, {});
    await queryInterface.bulkDelete('Users', null, {});
    await queryInterface.bulkDelete('Admins', null, {});
  }
};
