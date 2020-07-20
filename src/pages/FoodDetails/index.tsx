import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';
import { Image } from 'react-native';

import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import formatValue from '../../utils/formatValue';

import api from '../../services/api';

import {
  Container,
  Header,
  ScrollContainer,
  FoodsContainer,
  Food,
  FoodImageContainer,
  FoodContent,
  FoodTitle,
  FoodDescription,
  FoodPricing,
  AdditionalsContainer,
  Title,
  TotalContainer,
  AdittionalItem,
  AdittionalItemText,
  AdittionalQuantity,
  PriceButtonContainer,
  TotalPrice,
  QuantityContainer,
  FinishOrderButton,
  ButtonText,
  IconContainer,
  OrderSuccesfulContainer,
  OrderSuccesfulMessage,
} from './styles';

interface Params {
  id: number;
}

interface Extra {
  id: number;
  name: string;
  value: number;
  quantity: number;
}

interface Food {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  thumbnail_url: string;
  formattedPrice: string;
  extras: Extra[];
}

interface FoodOrder extends Food {
  product_id: number;
  'food-quantity': number;
}

const FoodDetails: React.FC = () => {
  const [food, setFood] = useState({} as Food);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [foodQuantity, setFoodQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();

  const routeParams = route.params as Params;

  useEffect(() => {
    async function loadFood(): Promise<void> {
      let response = await api.get(`/foods/${routeParams.id}`);
      const responseFood = response.data as Food;

      response = await api.get('favorites');
      const favoriteFoods = response.data as Food[];
      const isAlreadyFavorite = favoriteFoods.find(
        fav => fav.id === responseFood.id,
      );
      if (isAlreadyFavorite) {
        setIsFavorite(true);
      }

      const formattedExtras = responseFood.extras.map(extra => ({
        ...extra,
        quantity: 0,
      }));

      const formattedFood = {
        ...responseFood,
        formattedPrice: formatValue(responseFood.price),
        'food-quantity': 1,
      };

      setFood(formattedFood);
      setExtras(formattedExtras);
    }

    loadFood();
  }, [routeParams]);

  function handleIncrementExtra(id: number): void {
    const extraIndexBeingChanged = extras.findIndex(extra => extra.id === id);
    if (extraIndexBeingChanged < 0) {
      return;
    }

    const extraBeingChanged = extras[extraIndexBeingChanged];
    extraBeingChanged.quantity += 1;

    const newExtras = extras;
    newExtras.splice(extraIndexBeingChanged, 1, extraBeingChanged);
    setExtras([...newExtras]);
  }

  function handleDecrementExtra(id: number): void {
    const extraIndexBeingChanged = extras.findIndex(extra => extra.id === id);
    if (extraIndexBeingChanged < 0) {
      return;
    }

    const extraBeingChanged = extras[extraIndexBeingChanged];
    if (extraBeingChanged.quantity <= 0) {
      return;
    }

    extraBeingChanged.quantity -= 1;

    const newExtras = extras;
    newExtras.splice(extraIndexBeingChanged, 1, extraBeingChanged);
    setExtras([...newExtras]);
  }

  const handleIncrementFood = useCallback((): void => {
    setFoodQuantity(value => value + 1);
  }, []);

  const handleDecrementFood = useCallback((): void => {
    setFoodQuantity(value => (value > 1 ? value - 1 : value));
  }, []);

  const toggleFavorite = useCallback(async () => {
    if (isFavorite) {
      await api.delete(`favorites/${food.id}`);
    } else {
      const newFood = { ...food };
      delete newFood.formattedPrice;
      delete newFood.extras;

      await api.post('favorites', newFood);
    }
    setIsFavorite(value => !value);
  }, [isFavorite, food]);

  const cartTotal = useMemo(() => {
    const extraPrice = extras.reduce(
      (sum, extra) => sum + extra.value * extra.quantity,
      0,
    );

    const price = (food.price + extraPrice) * foodQuantity;

    return formatValue(price);
  }, [extras, food, foodQuantity]);

  async function handleFinishOrder(): Promise<void> {
    const extrasFiltered = extras.filter(extra => extra.quantity > 0);
    const finishedOrder: FoodOrder = {
      ...food,
      product_id: food.id,
      'food-quantity': foodQuantity,
      extras: { ...extrasFiltered },
      formattedPrice: cartTotal,
    };
    delete finishedOrder.id;

    await api.post('orders', finishedOrder);

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('MainBottom');
    }, 2000);
  }

  // Calculate the correct icon name
  const favoriteIconName = useMemo(
    () => (isFavorite ? 'favorite' : 'favorite-border'),
    [isFavorite],
  );

  useLayoutEffect(() => {
    // Add the favorite icon on the right of the header bar
    navigation.setOptions({
      headerRight: () => (
        <MaterialIcon
          name={favoriteIconName}
          size={24}
          color="#FFB84D"
          onPress={() => toggleFavorite()}
        />
      ),
    });
  }, [navigation, favoriteIconName, toggleFavorite]);

  useLayoutEffect(() => {
    // Toggle header bar when finishing buy
    navigation.setOptions({
      headerShown: !isLoading,
    });
  }, [navigation, isLoading]);

  return (
    <>
      <Container>
        <Header />

        <ScrollContainer>
          <FoodsContainer>
            <Food>
              <FoodImageContainer>
                <Image
                  style={{ width: 327, height: 183 }}
                  source={{
                    uri: food.image_url,
                  }}
                />
              </FoodImageContainer>
              <FoodContent>
                <FoodTitle>{food.name}</FoodTitle>
                <FoodDescription>{food.description}</FoodDescription>
                <FoodPricing>{food.formattedPrice}</FoodPricing>
              </FoodContent>
            </Food>
          </FoodsContainer>
          <AdditionalsContainer>
            <Title>Adicionais</Title>
            {extras.map(extra => (
              <AdittionalItem key={extra.id}>
                <AdittionalItemText>{extra.name}</AdittionalItemText>
                <AdittionalQuantity>
                  <Icon
                    size={15}
                    color="#6C6C80"
                    name="minus"
                    onPress={() => handleDecrementExtra(extra.id)}
                    testID={`decrement-extra-${extra.id}`}
                  />
                  <AdittionalItemText testID={`extra-quantity-${extra.id}`}>
                    {extra.quantity}
                  </AdittionalItemText>
                  <Icon
                    size={15}
                    color="#6C6C80"
                    name="plus"
                    onPress={() => handleIncrementExtra(extra.id)}
                    testID={`increment-extra-${extra.id}`}
                  />
                </AdittionalQuantity>
              </AdittionalItem>
            ))}
          </AdditionalsContainer>
          <TotalContainer>
            <Title>Total do pedido</Title>
            <PriceButtonContainer>
              <TotalPrice testID="cart-total">{cartTotal}</TotalPrice>
              <QuantityContainer>
                <Icon
                  size={15}
                  color="#6C6C80"
                  name="minus"
                  onPress={handleDecrementFood}
                  testID="decrement-food"
                />
                <AdittionalItemText testID="food-quantity">
                  {foodQuantity}
                </AdittionalItemText>
                <Icon
                  size={15}
                  color="#6C6C80"
                  name="plus"
                  onPress={handleIncrementFood}
                  testID="increment-food"
                />
              </QuantityContainer>
            </PriceButtonContainer>

            <FinishOrderButton onPress={() => handleFinishOrder()}>
              <ButtonText>Confirmar pedido</ButtonText>
              <IconContainer>
                <Icon name="check-square" size={24} color="#fff" />
              </IconContainer>
            </FinishOrderButton>
          </TotalContainer>
        </ScrollContainer>
      </Container>
      {isLoading && (
        <OrderSuccesfulContainer>
          <Icon size={42} color="#39b100" name="thumbs-up" />
          <OrderSuccesfulMessage>Pedido Confirmado!</OrderSuccesfulMessage>
        </OrderSuccesfulContainer>
      )}
    </>
  );
};

export default FoodDetails;
