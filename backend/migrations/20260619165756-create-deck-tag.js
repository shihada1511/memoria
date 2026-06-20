'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DeckTags', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      deckId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Decks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tagId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Tags', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    await queryInterface.addConstraint('DeckTags', {
      fields: ['deckId', 'tagId'],
      type: 'unique',
      name: 'unique_deck_tag'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DeckTags');
  }
};
