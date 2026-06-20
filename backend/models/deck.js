'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Deck extends Model {
    static associate(models) {
      Deck.belongsTo(models.User, { foreignKey: 'userId', as: 'owner' });
      Deck.hasMany(models.Card, { foreignKey: 'deckId', as: 'cards', onDelete: 'CASCADE' });
      Deck.belongsToMany(models.Tag, { through: models.DeckTag, foreignKey: 'deckId', otherKey: 'tagId', as: 'tags' });
    }
  }
  Deck.init({
    title: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'Deck',
    tableName: 'Decks'
  });
  return Deck;
};
