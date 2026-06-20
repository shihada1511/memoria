'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Card extends Model {
    static associate(models) {
      Card.belongsTo(models.Deck, { foreignKey: 'deckId', as: 'deck' });
    }
  }
  Card.init({
    deckId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Decks', key: 'id' }
    },
    question: { type: DataTypes.TEXT, allowNull: false },
    answer: { type: DataTypes.TEXT, allowNull: false }
  }, {
    sequelize,
    modelName: 'Card',
    tableName: 'Cards'
  });
  return Card;
};
