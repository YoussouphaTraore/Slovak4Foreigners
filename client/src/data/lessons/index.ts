import type { Lesson } from '../../types/lesson';
import s1FirstWords from './S1_First_Words/Polite-Basics.json';
import s1FirstWords2 from './S1_First_Words/Help-Repair.json';
import s1Verbs from './S1_Common_Verbs/To-Be.json';
import s1Verbs2 from './S1_Common_Verbs/Need-Want.json';
import s1Verbs3 from './S1_Common_Verbs/Speak-Understand.json';
import s1Verbs4 from './S1_Common_Verbs/Moving-Living.json';
import s1Verbs5 from './S1_Common_Verbs/Food-Money-Actions.json';
import s1Greetings from './S1_Greetings/Greetings.json';
import s1HowAreYou from './S1_Greetings/How-Are-You.json';
import s1DontUnderstand from './S1_Dont_Understand/I-Dont-Understand.json';
import s1DontUnderstand2 from './S1_Dont_Understand/Make-It-Clearer.json';
import s1WhoIAm from './S1_Who_I_Am/Name-Origin.json';
import s1WhoIAm2 from './S1_Who_I_Am/Country-of-Origin.json';
import s1DescribingYourself from './S1_Who_I_Am/Gender-Age-Status.json';
import s1DescribingYourself2 from './S1_Who_I_Am/Height-Appearance.json';
import s1HeadArea from './S1_Parts_Of_Body/Head-Area.json';
import s1Limbs from './S1_Parts_Of_Body/Limbs.json';
import s1Body from './S1_Parts_Of_Body/Body.json';
import s1BodyPain from './S1_Parts_Of_Body/Body-Pain.json';
import s1BasicColors from './S1_Colors/Basic-Colors.json';
import s1MoreColors from './S1_Colors/More-Colors.json';
import s1DescribingColors from './S1_Colors/Describing-Colors.json';
import s1PartnerChildren from './S1_Family/Partner-Children.json';
import s1ParentsSiblings from './S1_Family/Parents-Siblings.json';
import s1ExtendedFamily from './S1_Family/Extended-Family.json';
import s1InLawsStatus from './S1_Family/In-Laws-Status.json';
import s1Numbers05 from './S1_Numbers/Numbers-0-5.json';
import s1Numbers610 from './S1_Numbers/Numbers-6-10.json';
import s1TeenNumbers from './S1_Numbers/Teen-Numbers.json';
import s1BiggerNumbers from './S1_Numbers/Bigger-Numbers.json';
import s1Order15 from './S1_Numbers/Order-1-5.json';
import s1Order610 from './S1_Numbers/Order-6-10.json';
import s1PricesCost from './S1_Money/Prices-Cost.json';
import s1Paying from './S1_Money/Paying.json';
import s1BillsReceipts from './S1_Money/Bills-Receipts.json';
import s1PartsOfDay from './S1_Time/Parts-of-Day.json';
import s1ClockTime from './S1_Time/Clock-Time.json';
import s1Days from './S1_Calendar/Days.json';
import s1TodayPlans from './S1_Time/Today-Plans.json';
import s1SpeakingFuture from './S1_Speaking_In_Time/Speaking-in-the-Future.json';
import s1SpeakingPast from './S1_Speaking_In_Time/Speaking-in-the-Past.json';
import s1Weeks from './S1_Calendar/Weeks.json';
import s1WeeksInMonth from './S1_Calendar/Weeks-in-a-Month.json';
import s1MonthsJanJun from './S1_Calendar/Months-Jan-Jun.json';
import s1MonthsJulDec from './S1_Calendar/Months-Jul-Dec.json';
import s1TalkingAboutMonths from './S1_Calendar/Talking-About-Months.json';
import s1WeatherWords from './S1_Weather/Weather-Words.json';
import s1WeatherOutside from './S1_Weather/Weather-Outside.json';
import s1StreetCity from './S1_My_Address/Street-City.json';
import s1ApartmentDetails from './S1_My_Address/Apartment-Details.json';
import s1AddressOnForms from './S1_My_Address/Address-on-Forms.json';
import s1BasicDirections from './S1_Directions/Basic-Directions.json';
import s1HereThere from './S1_Directions/Here-There.json';
import s1GoThisWay from './S1_Directions/Go-This-Way.json';
import s1InsideOutside from './S1_Positions/Inside-Outside.json';
import s1AroundAPlace from './S1_Positions/Around-a-Place.json';
import s1AboveBelowBetween from './S1_Positions/Above-Below-Between.json';
import s1EmergencyNumbers from './S1_Emergency/Emergency-Numbers.json';
import s1EmergencyPeople from './S1_Emergency/Emergency-People.json';
import s1WhatHappened from './S1_Emergency/What-Happened.json';
import s1HospitalCheckIn from './S1_Medical/Hospital-Check-In.json';
import s1Symptoms from './S1_Medical/Symptoms.json';
import s1TalkingToDoctor from './S1_Medical/Talking-to-the-Doctor.json';
import s1MedicineWords from './S1_Medical/Medicine-Words.json';
import s1AskingAtPharmacy from './S1_Medical/Asking-at-the-Pharmacy.json';
import s1MedicineInstructions from './S1_Medical/Medicine-Instructions.json';
import s1FoodBasics from './S1_Food/Food-Basics.json';
import s1Fruit from './S1_Food/Fruit.json';
import s1Vegetables from './S1_Food/Vegetables.json';
import s1MoreFoodMeals from './S1_Food/More-Food-and-Meals.json';
import s1FoodDescriptions from './S1_Food/Food-Descriptions.json';
import s1DietaryNeeds from './S1_Food/Dietary-Needs.json';
import s1RestaurantBasics from './S1_Ordering_Food/Restaurant-Basics.json';
import s1PayingAfterMeal from './S1_Ordering_Food/Paying-After-the-Meal.json';
import s1FoodDelivery from './S1_Ordering_Food/Food-Delivery.json';
import s1SupermarketBasics from './S1_Supermarket/Supermarket-Basics.json';
import s1ShopQuantities from './S1_Supermarket/Shop-Quantities.json';
import s1SupermarketCheckout from './S1_Supermarket/Supermarket-Checkout.json';
import s1TransportModes from './S1_Getting_Around/Transport-Modes.json';
import s1GoingBy from './S1_Getting_Around/Going-By.json';
import s1TravelBasics from './S1_Getting_Around/Travel-Basics.json';
import s1TicketsPasses from './S1_Public_Transport/Tickets-and-Passes.json';
import s1StopsRoutes from './S1_Public_Transport/Stops-and-Routes.json';
import s1OnBoard from './S1_Public_Transport/On-Board.json';
import s1BookingTaxi from './S1_Taxi/Booking-a-Taxi.json';
import s1TaxiDestinationPrice from './S1_Taxi/Destination-and-Price.json';
import s1DuringTaxiRide from './S1_Taxi/During-the-Ride.json';
import s1RoomsAtHome from './S1_Home_Items/Rooms-at-Home.json';
import s1FurnitureAppliances from './S1_Home_Items/Furniture-Appliances.json';
import s1HomeProblems from './S1_Home_Items/Home-Problems.json';
import s1CommonPets from './S1_Pets/Common-Pets.json';
import s1PetCareRules from './S1_Pets/Pet-Care-Rules.json';
import s1CommonDrinks from './S1_Beverages/Common-Drinks.json';
import s1OfferingDrinks from './S1_Beverages/Offering-Drinks.json';
import s1ShoppingBasics from './S1_Shopping/Shopping-Basics.json';
import s1AtTheShop from './S1_Shopping/At-the-Shop.json';
import s1CommonClothes from './S1_Clothes/Common-Clothes.json';
import s1ShoesAccessories from './S1_Clothes/Shoes-Accessories.json';
import s1SizesFit from './S1_Size_Fit/Sizes-and-Fit.json';
import s1ReturnsReceipts from './S1_Returns/Returns-Receipts.json';
import s2MarekIntroduction from './s2-marek-introduction.json';
import s2SaraIntroduction from './s2-sara-introduction.json';
import s2MarekSaraMeeting from './s2-marek-sara-meeting.json';
import s2IntroduceYourself from './s2-introduce-yourself.json';
import tcFirstWords from './TC_Monologues/tc-first-words.json';
import tcCommonVerbs from './TC_Monologues/tc-common-verbs.json';
import tcGreetings from './TC_Monologues/tc-greetings.json';
import tcDontUnderstand from './TC_Monologues/tc-dont-understand.json';
import tcWhoIAm from './TC_Monologues/tc-who-i-am.json';
import tcBody from './TC_Monologues/tc-body.json';
import tcColors from './TC_Monologues/tc-colors.json';
import tcFamily from './TC_Monologues/tc-family.json';
import tcNumbers from './TC_Monologues/tc-numbers.json';
import tcMoney from './TC_Monologues/tc-money.json';
import tcTime from './TC_Monologues/tc-time.json';
import tcCalendar from './TC_Monologues/tc-calendar.json';
import tcSpeakingTime from './TC_Monologues/tc-speaking-time.json';
import tcWeather from './TC_Monologues/tc-weather.json';
import tcAddress from './TC_Monologues/tc-address.json';
import tcDirections from './TC_Monologues/tc-directions.json';
import tcPositions from './TC_Monologues/tc-positions.json';
import tcEmergency from './TC_Monologues/tc-emergency.json';
import tcMedical from './TC_Monologues/tc-medical.json';
import tcFood from './TC_Monologues/tc-food.json';
import tcOrderingFood from './TC_Monologues/tc-ordering-food.json';
import tcSupermarket from './TC_Monologues/tc-supermarket.json';
import tcTransport from './TC_Monologues/tc-transport.json';
import tcPublicTransport from './TC_Monologues/tc-public-transport.json';
import tcTaxi from './TC_Monologues/tc-taxi.json';
import tcHome from './TC_Monologues/tc-home.json';
import tcPets from './TC_Monologues/tc-pets.json';
import tcBeverages from './TC_Monologues/tc-beverages.json';
import tcShoppingBasics from './TC_Monologues/tc-shopping-basics.json';
import tcClothes from './TC_Monologues/tc-clothes.json';
import tcSizeFit from './TC_Monologues/tc-size-fit.json';
import tcReturns from './TC_Monologues/tc-returns.json';


export const lessons: Lesson[] = [
  s1FirstWords as unknown as Lesson,
  s1FirstWords2 as unknown as Lesson,
  s1Verbs as unknown as Lesson,
  s1Verbs2 as unknown as Lesson,
  s1Verbs3 as unknown as Lesson,
  s1Verbs4 as unknown as Lesson,
  s1Verbs5 as unknown as Lesson,
  s1Greetings as unknown as Lesson,
  s1HowAreYou as unknown as Lesson,
  s1DontUnderstand as unknown as Lesson,
  s1DontUnderstand2 as unknown as Lesson,
  s1WhoIAm as unknown as Lesson,
  s1WhoIAm2 as unknown as Lesson,
  s1DescribingYourself as unknown as Lesson,
  s1DescribingYourself2 as unknown as Lesson,
  s1HeadArea as unknown as Lesson,
  s1Limbs as unknown as Lesson,
  s1Body as unknown as Lesson,
  s1BodyPain as unknown as Lesson,
  s1BasicColors as unknown as Lesson,
  s1MoreColors as unknown as Lesson,
  s1DescribingColors as unknown as Lesson,
  s1PartnerChildren as unknown as Lesson,
  s1ParentsSiblings as unknown as Lesson,
  s1ExtendedFamily as unknown as Lesson,
  s1InLawsStatus as unknown as Lesson,
  s1Numbers05 as unknown as Lesson,
  s1Numbers610 as unknown as Lesson,
  s1TeenNumbers as unknown as Lesson,
  s1BiggerNumbers as unknown as Lesson,
  s1Order15 as unknown as Lesson,
  s1Order610 as unknown as Lesson,
  s1PricesCost as unknown as Lesson,
  s1Paying as unknown as Lesson,
  s1BillsReceipts as unknown as Lesson,
  s1PartsOfDay as unknown as Lesson,
  s1ClockTime as unknown as Lesson,
  s1Days as unknown as Lesson,
  s1TodayPlans as unknown as Lesson,
  s1SpeakingFuture as unknown as Lesson,
  s1SpeakingPast as unknown as Lesson,
  s1Weeks as unknown as Lesson,
  s1WeeksInMonth as unknown as Lesson,
  s1MonthsJanJun as unknown as Lesson,
  s1MonthsJulDec as unknown as Lesson,
  s1TalkingAboutMonths as unknown as Lesson,
  s1WeatherWords as unknown as Lesson,
  s1WeatherOutside as unknown as Lesson,
  s1StreetCity as unknown as Lesson,
  s1ApartmentDetails as unknown as Lesson,
  s1AddressOnForms as unknown as Lesson,
  s1BasicDirections as unknown as Lesson,
  s1HereThere as unknown as Lesson,
  s1GoThisWay as unknown as Lesson,
  s1InsideOutside as unknown as Lesson,
  s1AroundAPlace as unknown as Lesson,
  s1AboveBelowBetween as unknown as Lesson,
  s1EmergencyNumbers as unknown as Lesson,
  s1EmergencyPeople as unknown as Lesson,
  s1WhatHappened as unknown as Lesson,
  s1HospitalCheckIn as unknown as Lesson,
  s1Symptoms as unknown as Lesson,
  s1TalkingToDoctor as unknown as Lesson,
  s1MedicineWords as unknown as Lesson,
  s1AskingAtPharmacy as unknown as Lesson,
  s1MedicineInstructions as unknown as Lesson,
  s1FoodBasics as unknown as Lesson,
  s1Fruit as unknown as Lesson,
  s1Vegetables as unknown as Lesson,
  s1MoreFoodMeals as unknown as Lesson,
  s1FoodDescriptions as unknown as Lesson,
  s1DietaryNeeds as unknown as Lesson,
  s1RestaurantBasics as unknown as Lesson,
  s1PayingAfterMeal as unknown as Lesson,
  s1FoodDelivery as unknown as Lesson,
  s1SupermarketBasics as unknown as Lesson,
  s1ShopQuantities as unknown as Lesson,
  s1SupermarketCheckout as unknown as Lesson,
  s1TransportModes as unknown as Lesson,
  s1GoingBy as unknown as Lesson,
  s1TravelBasics as unknown as Lesson,
  s1TicketsPasses as unknown as Lesson,
  s1StopsRoutes as unknown as Lesson,
  s1OnBoard as unknown as Lesson,
  s1BookingTaxi as unknown as Lesson,
  s1TaxiDestinationPrice as unknown as Lesson,
  s1DuringTaxiRide as unknown as Lesson,
  s1RoomsAtHome as unknown as Lesson,
  s1FurnitureAppliances as unknown as Lesson,
  s1HomeProblems as unknown as Lesson,
  s1CommonPets as unknown as Lesson,
  s1PetCareRules as unknown as Lesson,
  s1CommonDrinks as unknown as Lesson,
  s1OfferingDrinks as unknown as Lesson,
  s1ShoppingBasics as unknown as Lesson,
  s1AtTheShop as unknown as Lesson,
  s1CommonClothes as unknown as Lesson,
  s1ShoesAccessories as unknown as Lesson,
  s1SizesFit as unknown as Lesson,
  s1ReturnsReceipts as unknown as Lesson,
  s2MarekIntroduction as unknown as Lesson,
  s2SaraIntroduction as unknown as Lesson,
  s2MarekSaraMeeting as unknown as Lesson,
  s2IntroduceYourself as unknown as Lesson,
  tcFirstWords as unknown as Lesson,
  tcCommonVerbs as unknown as Lesson,
  tcGreetings as unknown as Lesson,
  tcDontUnderstand as unknown as Lesson,
  tcWhoIAm as unknown as Lesson,
  tcBody as unknown as Lesson,
  tcColors as unknown as Lesson,
  tcFamily as unknown as Lesson,
  tcNumbers as unknown as Lesson,
  tcMoney as unknown as Lesson,
  tcTime as unknown as Lesson,
  tcCalendar as unknown as Lesson,
  tcSpeakingTime as unknown as Lesson,
  tcWeather as unknown as Lesson,
  tcAddress as unknown as Lesson,
  tcDirections as unknown as Lesson,
  tcPositions as unknown as Lesson,
  tcEmergency as unknown as Lesson,
  tcMedical as unknown as Lesson,
  tcFood as unknown as Lesson,
  tcOrderingFood as unknown as Lesson,
  tcSupermarket as unknown as Lesson,
  tcTransport as unknown as Lesson,
  tcPublicTransport as unknown as Lesson,
  tcTaxi as unknown as Lesson,
  tcHome as unknown as Lesson,
  tcPets as unknown as Lesson,
  tcBeverages as unknown as Lesson,
  tcShoppingBasics as unknown as Lesson,
  tcClothes as unknown as Lesson,
  tcSizeFit as unknown as Lesson,
  tcReturns as unknown as Lesson,
];

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}


























