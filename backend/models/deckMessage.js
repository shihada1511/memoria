'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DeckMessage extends Model {
    static associate(models) {
      DeckMessage.belongsTo(models.Deck, { foreignKey: 'deckId', as: 'deck' });
      DeckMessage.belongsTo(models.User, { foreignKey: 'userId', as: 'sender' });
    }
  }
  DeckMessage.init({
    deckId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false }
  }, { sequelize, modelName: 'DeckMessage', tableName: 'DeckMessages' });
  return DeckMessage;
};
