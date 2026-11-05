# Exam detail sheet

## Exam

- **Format:** Multiple choice
- **Number of questions:** 50
- **Passing score:** 70% (35/50)
- **Exam duration:** 2 hours (if needed)

The exam focuses on practical knowledge and scenarios that validate your knowledge and professional experience. Each question has only one correct answer, and incorrect answers do not affect your final score.

## Exam topics

The Associate Developer Exam focuses on the fundamentals of OutSystems 11 application development, common to web and mobile applications, such as data modeling, UI development, logic, screen lifecycle, and modular architecture. The following table has the topics' breakdown and the respective weights.

|     **Categories & Topics**      | **Number of Questions** | **% of score** |
| :------------------------------: | :---------------------: | :------------: |
| **Reactive Apps in OutSystems**  |          **6**          |    **12%**     |
|         Client Variables         |            1            |       2%       |
|         Screen Lifecycle         |            3            |       6%       |
|     Debugging and Monitoring     |            2            |       4%       |
|        **Data Modeling**         |          **6**          |    **12%**     |
|      Entities & Data Types       |            4            |       8%       |
|        Data Relationships        |            2            |       4%       |
|        **Fetching Data**         |         **10**          |    **20%**     |
|            Aggregates            |            6            |      12%       |
|     Fetching Data on Screens     |            4            |       8%       |
|            **Logic**             |         **11**          |    **22%**     |
|    Client and Server Actions     |            2            |       4%       |
|         Form Validations         |            4            |       8%       |
| Logic Flows & Exception Handling |            5            |      10%       |
|          **UI Design**           |         **13**          |    **26%**     |
|          Screen Widgets          |            9            |      18%       |
|        Blocks and Events         |            4            |       8%       |
|   **Architecture & Security**    |          **4**          |     **8%**     |
|       Modular Dependencies       |            2            |       4%       |
|       Role-based Security        |            2            |       4%       |

- Documentation for additional information (Web Development only)
	- [Use Data](https://www.outsystems.com/tk/redirect?g=bca4c88f-38d9-4f5f-93a6-bffca22d7278)
	- [Design UI](https://www.outsystems.com/tk/redirect?g=5fa4c8b3-0ab5-4ac3-8696-40b0a55d340d)
	- [Implement Application Logic](https://www.outsystems.com/tk/redirect?g=1eef31a3-6807-412e-98e1-0e3b93fc6050)
	- [Logic](https://www.outsystems.com/tk/redirect?g=28b9d7ad-f72c-47d6-8ed7-5731b3792ff8)

---




# Extra recommended resources



# Application Logic

# Application Logic

In OutSystems, the logic of your applications is implemented through **Actions**. While developing your applications, you can create your own custom actions and use the actions OutSystems provides you:

- **OutSystems built-in actions:** Actions that are defined by the platform and cannot be modified or inspected. You can use them in your action flows, such as Entity Actions, System Actions, or Role Actions.
- **Custom actions:** The actions that you create to define your business rules, fetch data from the database, run integrations with external systems, among other operations.
- **Actions that handle System Events:** Actions that run at specific moments of the application life cycle, such as when a web session starts or a mobile app resumes. You are able to design the flow of these actions according to your business rules.

## Actions in Reactive Web and Mobile apps

The architecture of Reactive Web and Mobile apps is different from the architecture of Tradtional Web and Service apps and this affects the type of actions available and in which context the logic runs. While in Traditional Web and Service apps all the logic runs on the server, in Reactive Web and Mobile apps some of the logic may run on the server and some logic may run on the client — the user's device.

When developing the logic of your Reactive Web and Mobile apps you must take into account that every time your client side logic needs to execute server side logic, the user's device will make a request to the server and wait for the server response. This communication requires that the user's device is online (connected to the internet).

# Built-in Functions

When designing the business logic of your application, you can use the following built-in functions, displayed by categories:

- [Math](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/math/)
- [Numeric](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/numeric/)
- [Text](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/text/)
- [Date and Time](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/date_and_time/)
- [Data Conversion](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/data_conversion/)
- [Format](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/format/)
- [Email](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/email/)
- [Environment](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/environment/)
- [URL](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/url/)
- [Miscellaneous](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/miscellaneous/)
- [Roles](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/roles/)



# Expressions

# Expressions

An expression consists of [operands](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/expressions/operands/) and [operators](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/expressions/operators/), or just one operand. For example, **n + 1** is an expression with two operands, **n** and **1**, joined by the addition operator +.

If you are creating an expression and encounter errors, check [here](https://learn.outsystems.com/documentation/11/reference/errors_and_warnings/errors/invalid_expression_error/) for the causes and the actions you can take to resolve them.

Here is how you can edit expressions and show the expression values.

- Use the [expression editor](https://learn.outsystems.com/documentation/11/building_apps/application_logic/edit_expressions/) to **edit expressions**. The expression editor shows you available elements. It automatically completes the text and shows suggestions after you press **Ctrl+Space**.

	![Screenshot of the expression editor interface showing available elements and autocomplete suggestions](https://learn.outsystems.com/TK_Resource/fa955c90-113e-4c6b-9198-9ccd8a137fff)

- **Edit expressions** inline in the properties of elements.

	![Screenshot of inline expression editing within the properties of an element](https://learn.outsystems.com/TK_Resource/b08f121e-a6eb-43fb-8faa-2eb622c7a668)

- To **show the result** of an expression, use the [expression widget](https://learn.outsystems.com/documentation/11/reference/outsystems_language/interfaces/designing_screens/expression/). This is similar to the **print** command in other programming languages.

	![Screenshot of the expression widget used to display the result of an expression](https://learn.outsystems.com/TK_Resource/319f581e-c9ce-4d90-8d98-9d51ff31a13c)

## Notes

Here are some tips for using expressions.

- You can use many functions to manipulate the type Text, however, you can only use the **+** (addition) operand with type Text.

	Example: `"Hello, " + UserName`, where the value of **UserName** is **Billy**, returns `"Hello, Billy!"`.

- You can use the [built-in functions](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/date_and_time/) to perform various operations on the types **Date**, **Time**, and **DateTime**.

	Example: `AddDays(#2020-01-01 00:00:00#, 90)`. **AddDays** is a function that adds **n** days to a Date Time value. Date Time is here a literal `#2020-01-01 00:00:00#`. The expression returns `#2020-03-31 00:00:00#`.

- You can only use the operators **=** and **<>** (equality operators) for the type `Record`.

- For the type **Identifier**, use the [built-in functions](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/built_in_functions/data_conversion/).

- The types **BinaryData** and **Record List** don't support calculations.

# ogic Elements

# Logic Elements

Logic in OutSystems can be defined through Actions. An Action is a logic element that allows you to define logic flows that run on the server or client-side of your app. You can use logic elements in your reactive web and mobile apps to define custom algorithms. Some of OutSystems logic elements include [Screen Actions](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_elements/screen_action/) that contain logic specific to a single screen, [Client Actions](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_elements/client_action/) that run logic on the device, and [Server Actions](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_elements/server_action/) that run logic on the server.

![Diagram illustrating the different logic elements in OutSystems, including Screen Actions, Client Actions, and Server Actions](https://learn.outsystems.com/TK_Resource/5633878a-0bf8-46b8-b099-90aecce21fb5)

For more information about different logic elements, see:

- [Client Action](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_elements/client_action/)
- [Screen Action](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_elements/screen_action/)
- [Server Action](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_elements/server_action/)
- [Service Action](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_elements/service_action/)
- [Download](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/download/)
- [Role](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_elements/role/)
- [User Exception](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_elements/user_exception/)
- [Role Exception](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_elements/role_exception/)

# Logic Tools

The Service Studio toolbox contains a range of logic tools that help you build comprehensive apps. The logic tools allow you to, for example, run server actions that implement the business rules of your app, retrieve updated data from data sources, and assign values to variables.

![Diagram illustrating the range of logic tools available in Service Studio for building applications](https://learn.outsystems.com/TK_Resource/0bf5685b-a676-4c2a-9e43-dbefbb8947bf)

For more information about each of the logic tools, see:

- [Start](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/start/)
- [Run Client Action](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/run_client_action/)
- [Run Server Action](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/run_server_action/)
- [Refresh Data](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/refresh_data/)
- [If](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/if/)
- [Switch](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/switch/)
- [For Each](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/for_each/)
- [Assign](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/assign/)
- [Record List To Excel](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/record_list_to_excel/)
- [Excel To Record List](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/excel_to_record_list/)
- [JSON Deserialize](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/json_deserialize/)
- [JSON Serialize](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/json_serialize/)
- [Exception Handler](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/exception_handler/)
- [Raise Exception](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/raise_exception/)
- [Comment](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/comment/)
- [Message](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/message/)
- [Destination](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/destination/)
- [Download](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/download/)
- [JavaScript](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/javascript/)
- [Trigger Event](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/trigger_event/)
- [End](https://learn.outsystems.com/documentation/11/reference/outsystems_language/logic/implementing_logic/logic_tools/end/)



# Sample Exam



# Sample exam

(note: I have already completed this exam, so correct answers are marked below. Also, it included images - which will not be supported in my quiz app at this time, so it's necessary to write new questions so that they don't rely on images).

1. Data relationships

 \+ 1

What is required to create a many-to-many (N-N) relationship between the Entities in the picture?

![img](https://learn.outsystems.com/TK_Resource/262750af-e8a4-54dc-846e-b615c7add3a8)

Create a third Entity that contains two attributes of types Order Identifier and Product Identifier.

Create a third Entity with a primary key of type Order Identifier and an attribute of type Product Identifier.

Create an attribute of type Order Identifier in the Product Entity and an attribute of type Product Identifier in the Order Entity.

Create an attribute of type Product Identifier in the Order Entity.

That's Right!

If you want to revisit this topic, take a look at [Modeling Data Relationships](https://www.outsystems.com/tk/redirect?g=ee07d28a-e432-4ed1-a600-67084df212ff).

2. Entities

 \+ 1

Which of the following statements is **true**?

An Entity Identifier must have its Data Type set to Long Integer.

An Entity Identifier must be set to Auto Number.

An Entity Identifier can only be a single attribute.

An Entity Identifier is created automatically and cannot be modified.

That's Right!

If you want to revisit this topic, take a look at [Modeling Data](https://www.outsystems.com/tk/redirect?g=89529ca3-0209-41d5-8612-5135126cf8e9).

3. Aggregates

 \+ 1

The image below shows an Aggregate. What will the attributes of the *GetOrdersShippingState.List.Current* record be?

![img](https://learn.outsystems.com/TK_Resource/0164bd41-64fd-574f-8ca1-d83dc20d7d96)

The two aggregation attributes: ShippingState and Count.

The two aggregation attributes (ShippingState and Count) plus all the attributes of the Source Entities.

Six attributes corresponding to the six visible columns in the Aggregate: ShippingState, Count, Description, CreatedOn, ShippedOn, and Priority.

The two aggregation attributes (ShippingState and Count) plus the columns used to calculate these aggregations.

That's Right!

If you want to revisit this topic, take a look at [Advanced Aggregates](https://www.outsystems.com/tk/redirect?g=e2aa1b00-c3f5-46fd-92b8-ab94536786c0).

4. Aggregates

 \+ 1

In the Aggregate below the Orders are fetched with their reviewers (Employees). Which of the following options is **correct**?

![img](https://learn.outsystems.com/TK_Resource/b34dadfd-add8-5c81-9ea4-f025145a4021)

The Aggregate only returns Orders with Priority, Status and Employee.

The Aggregate returns Orders without Employee and without Status.

The Aggregate returns Orders with Status and at least one Employee.

The Aggregate returns Orders with Priority and with zero or more Employees.

That's Right!

If you want to revisit this topic, take a look at [Advanced Aggregates](https://www.outsystems.com/tk/redirect?g=e2aa1b00-c3f5-46fd-92b8-ab94536786c0).

5. Aggregates

 \+ 1

How would you change the following Aggregate to return the number of orders per priority?

![img](https://learn.outsystems.com/TK_Resource/3770ce0b-1df7-5e97-abfc-23009d835518)

Change the Join between the Order and the Priority to Only With and create a Count over the Priority.Id attribute.

Create a Group By over the Priority.Id attribute and a Count over the Order.Id attribute.

Create a GroupBy over the Order.Id attribute and a Count over the Priority.Id attribute.

Remove the Join between the Order and the OrderStatus and create a Count over the Priority.Id attribute.

That's Right!

If you want to revisit this topic, take a look at [Advanced Aggregates](https://www.outsystems.com/tk/redirect?g=e2aa1b00-c3f5-46fd-92b8-ab94536786c0).

6. Programming model

 \+ 1

Which of the following sentences about the On Initialize lifecycle event is **true**?

The On Initialize event is triggered before the Screen or Block is rendered and before fetching any data.

The On Initialize event is triggered after the Screen or Block has been rendered, so you can use it to manipulate its structure.

The On Initialize event is triggered after an Aggregate finishes fetching data and can be used to act upon the retrieved data before it's used on the Screen.

The On Initialize event is triggered after the input parameter of a Block changes.

That's Right!

If you want to revisit this topic, take a look at [Programming Model](https://www.outsystems.com/tk/redirect?g=92ea4178-dd67-4705-a7d5-968e06329688).

7. Programming model

 \+ 0

The Screen below has two Dropdowns: one to select a Country and another to select a City. The *GetCountries* and *GetCities* Aggregates fetch the data displayed in the dropdowns and both have the Fetch property set to At Start. Which of the following options is not a valid step to fetch only the cities of the country selected in the dropdown?

![img](https://learn.outsystems.com/TK_Resource/a6324854-eab1-5bf2-aa58-9a5811925244)

Set the Fetch property of the GetCities Aggregate to Only On Demand.

Refresh the GetCities Aggregate in the OnChange Action of the Country Dropdown.

Filter the GetCities Aggregate by the selected country.

Call the GetCities Aggregate in the GetCountries' On After Fetch Event handler.

That's Right!

If you want to revisit this topic, take a look at [Programming Model](https://www.outsystems.com/tk/redirect?g=92ea4178-dd67-4705-a7d5-968e06329688).

8. Blocks

 \+ 1

Regarding Blocks in OutSystems reactive apps, which of the following options is **correct**?

Blocks can only be instantiated on Screens.

Blocks can be instantiated on Screens and other Blocks

Blocks can be instantiated on Client Actions on the Screen.

Blocks can be instantiated on Screens and external HTML pages, using a special HTML tag.

That's Right!

If you want to revisit this topic, take a look at [Blocks and Events](https://www.outsystems.com/tk/redirect?g=328be202-0e97-4399-a9ab-236fdf0aac99).

9. Block events

 \+ 1

Which of the following options is a **valid** usage of the Trigger Event node?

The Trigger Event allows a Block to notify its parent (Screen or Block) that something relevant occurred in the scope of the Block.

The Trigger Event allows a Screen to notify its children (Blocks) that something relevant occurred in the scope of the Screen.

The Trigger Event allows a Block to notify its children (other Blocks) that something relevant occurred in the scope of the Block.

The Trigger Event allows a Screen to notify its parent (Screen or Block) that something relevant occurred in the scope of the Screen.

That's Right!

If you want to revisit this topic, take a look at [Blocks and Events](https://www.outsystems.com/tk/redirect?g=328be202-0e97-4399-a9ab-236fdf0aac99).

10. Form validations

 \+ 1

A Form has a Save button with the Built-in Validations property set to Yes. Which validations are automatically performed when a user clicks the button?

Check if the mandatory fields are filled in.

Check if the mandatory fields are filled in and if the non-mandatory fields that are later used in the logic are also filled in.

Check if the mandatory fields are filled in and if the data submitted by the user matches the data type expected in the input fields.

Check if the mandatory fields are filled in and if the data submitted by the user matches the data type of the Form’s data source.

That's Right!

If you want to revisit this topic, take a look at [Form Validations](https://www.outsystems.com/tk/redirect?g=8fa654ce-b13f-4379-8ec0-90b06ec31d7e).

11. Building web forms

 \+ 1

The CountriesDropdown will allow users to select a country. What should be set in the Options Text property to ensure that the names of the countries appear in the dropdown?

![img](https://learn.outsystems.com/TK_Resource/6d94da03-e489-5ad0-ba7d-6f35ba374b15)

Country.Id

GetCountries.Country.Label

Country

Country.Label

That's Right!

If you want to revisit this topic, take a look at [Building Web Forms](https://www.outsystems.com/tk/redirect?g=6133d7a4-8219-4c74-bbca-beadc6de32ba).

12. Building web forms

 \+ 1

Considering a Button in a Screen, which of the following options cannot be set as its On Click property?

Screen.

Client Action.

Block.

External Site.

That's Right!

If you want to revisit this topic, take a look at [Building Web Forms](https://www.outsystems.com/tk/redirect?g=6133d7a4-8219-4c74-bbca-beadc6de32ba).

13. Logic

 \+ 1

The *Absolute* Action returns an absolute value (abs) of a number N passed as Input Parameter. When does the Action return 0?

![img](https://learn.outsystems.com/TK_Resource/c1d4fbd3-64f0-54b7-b732-a53dfc1cc2a8)

Never.

When the input parameter (N) is less than zero.

When the input parameter (N) is zero.

When the input parameter (N) is greater than zero.

That's Right!

If you want to revisit this topic, take a look at [Logic](https://www.outsystems.com/tk/redirect?g=eb4d7fec-4771-41e5-a99f-289d0b4f40fd).

14. Exceptions

 \+ 1

Consider the following Action. What happens if the *GetEmployeeById* Aggregate does not return any records?

![img](https://learn.outsystems.com/TK_Resource/d0c9d138-08a1-537c-bda9-5f804ebbff14)

The DatabaseException flow is executed.

The RecordNotFound flow is executed.

No exception flow is executed.

The module’s global exception handler is executed.

That's Right!

If you want to revisit this topic, take a look at [Logic](https://www.outsystems.com/tk/redirect?g=eb4d7fec-4771-41e5-a99f-289d0b4f40fd).

15. Logic

 \+ 0

Considering the Function property in Client Actions, which of the following options is correct?

Setting the Function property to Yes restricts the Action to have only one Output Parameter.

Setting the Function property to No ensures the Action can only be used in the module where it is defined.

Setting the Function property to Yes is not possible, if the Action is exposed to other modules as Public.

Setting the Function property to No ensures the Action can only be used in Screen Expressions.

That's Right!

If you want to revisit this topic, take a look at [Logic](https://www.outsystems.com/tk/redirect?g=eb4d7fec-4771-41e5-a99f-289d0b4f40fd).

16. Roles

 \+ 1

Michael is a user of the Orders application and only has the OrdersAdmin Role assigned to him. Which of the following options is **correct**?

Michael has access to Screens with the Registered Role checked.

Michael does not have access to Screens with the Anonymous Role checked.

Michael has access to Screens that have the OrdersAdmin Role checked, but not to Screens with the Registered Role checked.

Michael only has access to Screens that have the OrdersAdmin Role checked.

That's Right!

If you want to revisit this topic, take a look at [Role-based Security](https://www.outsystems.com/tk/redirect?g=485fc770-5522-403d-bbbc-273fbb12a1e9).

17. Client variables

 \+ 1

Which of the following options should **not** be a use case of Client Variables?

Username.

Password.

Search filter keyword.

ID of a user session.

That's Right!

If you want to revisit this topic, take a look at [Client Variables](https://www.outsystems.com/tk/redirect?g=3d892348-e3e5-4ac8-9202-b3e94e976b86).

18. Debugging

 \+ 1

The Action in the image calculates the square root (sqrt) of a positive decimal number (N). Knowing that the function was called with N = 0, and that the debugger is stopped at the Start node, what will happen when the developer selects the Continue (F9) option highlighted in the picture?

![img](https://learn.outsystems.com/TK_Resource/c5d0c97a-e49d-52ee-b35d-9507242756d9)

The Action will end, with sqrt = 0.

The Action will throw an exception and sqrt will have no value.

The debugger will stop in the N < 0 If node.

The debugger will stop at the breakpoint in the End node.

That's Right!

If you want to revisit this topic, take a look at [Debugging](https://www.outsystems.com/tk/redirect?g=96511a96-ad66-4867-ac31-fa07fb6ba79d).

19. Pagination and sorting

 \+ 1

The image below shows a Pagination widget that is associated with a Table on a Screen that was already implemented. There are no error messages in Service Studio, but when the user selects a new page (in the Pagination widget) the results do not change on the Table. What is the reason for that behavior?

![img](https://learn.outsystems.com/TK_Resource/95c8d5b4-ed46-5a45-9e5b-ea1ef8155fe6)

The GetMovies Aggregate is not being refreshed in the OnNavigate Action.

The Max. Records of the Aggregate should be equal to the total number of movies in the database.

The Table is not being refreshed on the OnNavigate Action.

The MaxRecords property of the Pagination should be set to GetMovies.Count and the TotalCount to RecordsPerPage.

That's Right!

If you want to revisit this topic, take a look at [Pagination and Sorting](https://www.outsystems.com/tk/redirect?g=682e00ef-b07b-4c5b-82b4-89b5342e7fd7).

20. Building web forms

 \+ 1

A Screen contains a Form to collect Customer data. The Form has a Save Button with the On Click property set to a SaveOnClick Action, which sends the data to the server to store it in the database. The developer must ensure that the Action will not send the data to the server when the mandatory Customer data fields have not been filled in. What is the best way to do that?

Set the Built-in validations of the Save button to Yes.

Perform custom validations for all inputs. If one fails, set the Valid property of the Form to False.

Set the Built-in validations of the Save button to Yes and check if the Form's Valid property is True.

Set the Built-in validations of the Save button to Yes and add an Exception Handler flow to handle invalid inputs.

That's Right!

If you want to revisit this topic, take a look at [Building Web Forms](https://www.outsystems.com/tk/redirect?g=6133d7a4-8219-4c74-bbca-beadc6de32ba).



# Becoming a web developer course


## Additional questions

1. Regarding Block Events, which of the following options is false?

 \+ 1

Events can be defined at the Block or Screen level.

Events allow to pass information from the Block's scope to the parent scope.

Events are triggered by a Block and handled by its parent.

Two instances of a Block may use the same handler for the same event.

That's Right!

Events allow to communicate with the parent element. Screens do not have a parent.

2. In which of the following situations is it necessary to define a handler for a Block Event?

 \+ 1

When the event has Input Parameters.

When the Block has Placeholders.

When the event Input Parameters are all mandatory.

When the Event is set to mandatory.

That's Right!

In these cases, a Client Action must be specified to handle the event. Although it may be empty.

3. In which of the following situations is the On Parameters Changed Event triggered?

 \+ 0.75

If the value of a Block Input Parameters changes inside a Client Action of the Block.

The On Parameters Changed must be explicitly triggered by the parent of the Block

When the parent of the Block changes the value of at least one of the Block Input Parameters.

That's Right!

This allows a Block to react to changes from the outside.

---



1. In OutSystems, a Block is a reusable UI component. Which of the following is NOT correct?

 \+ 1

A Block promotes reusability, i.e. develop once, reuse many times.

A Block encapsulates its own logic.

A Block improves maintainability, i.e., change the design or functionality, affect all usages.

A Block can only be reused once.

That's Right!

If it's used once, maybe it doesn't need to be a Block.

2. A Block can be used...

 \+ 1

Only inside other Screens.

Inside Screens and Blocks, including itself.

Inside Screens and Blocks, except on itself.

Only inside other Blocks.

That's Right!

Although Blocks can be used inside other Blocks, they cannot be used inside themselves as recursion is not allowed.

3. Regarding Placeholders, which of the following options is correct?

 \+ 1

A Placeholder reserves space in the interface to be allocated when the block is instantiated.

When a Block with Placeholders is instantiated, it is mandatory to place at least one widget inside the placeholders.

Placeholders can be added to Screens and Blocks.

Only one placeholder may be added per Block.

That's Right!

And the content inside the Placeholder may be different for each instance.

---

1. What is the Screen behavior when a widget is not valid (Valid property set to False)?

 \+ 1

The Screen displays the widget greyed out, and displays the validation error message on the input.

The widget does not appear on the Screen and the validation message appears in its place.

Displays the regular widget and displays the validation error message when we hover the mouse.

Displays the regular widget, applies a specific styling (e.g. red border), and displays the validation error message.

That's Right!

This way we can easily identify which inputs are not valid and why.

2. Which of the following options is not a built-in validation in OutSystems?

 \+ 1

Mandatory Fields

Maximum length of text fields

Data types of input fields

That's Right!

Correct! Mandatory fields and data types are the validation performed automatically by the platform.

3. Which of the following options is correct regarding the Valid property of the Form?

 \+ 0.5

The Valid property of the Form should be checked after the last custom validation.

The Valid property of the Form is automatically changed to False when all the input fields of the Form are not valid.

The Valid property of the Form should be explicitly set to False (e.g. with an Assign) when an input field is not valid.

When built-in validations are enabled, the Valid property of the Form is automatically checked before executing the client action logic.

That's Right!

This allows to branch the execution and avoid storing invalid data in the database.


---

1. Which of the following behaviors does not apply to Forms?

 \+ 1

A Form groups input widgets and allows displaying and editing data.

A Form has a Source property that will hold the values submitted by the user.

Besides input widgets, a Form can hold other widgets such as Links and Buttons.

A Form is useful to validate data submitted by the user.

That's Right!

It's actually the Inputs within a Form that has a Variable property that will have the value in each Input.

2. Considering the Dropdown and the Button Group, which of the following options is false?

 \+ 1

A Button Group needs a Button Group Item to represent each option that the user will have available to choose from.

The List property of the Dropdown defines the data that will appear as options to a user on a Screen.

Each Button Group Item within a Button Group has a Variable property to save the option chosen by the user.

The Variable property of the Dropdown will hold the value selected by the user. That value is defined in the Options Value property.

That's Right!

This is indeed a false statement. The Variable property actually belongs to the Button Group, which is where the value of the chosen Item will be saved.

3. The Checkbox or Switch Widgets are bound to a variable of which type?

 \+ 1

Text

Integer

Boolean

Date

That's Right!

That's it. True or false!

4. Considering Inputs and Labels, which of the following options is correct?

 \+ 1

Every input must have a Label associated with.

An input widget can only be used for the Text data type.

To access the value submitted in an Input widget, we can simply use InputName.Value.

Labels associated with mandatory fields will display a visual cue on the Screen.

That's Right!

That is actually a big advantage in having them!

---



1. Consider an Aggregate with a "With or Without" join between two entities. What is the expected output of the Aggregate?

 \+ 1

All records from both Entities (FULL OUTER JOIN).

Only records where there is a match between the two Entities (INNER JOIN).

All records from the left entity even if there is no match in the right entity (LEFT JOIN).

All records from the right entity even if there is no match in the left entity (RIGHT JOIN).

That's Right!

Yes! The With Or Without Join is equivalent to a LEFT JOIN, so the order of the Entities in the join matter!

2. Considering that Aggregates can have hidden columns, which of the following options is correct?

 \+ 1

Hiding columns in the Aggregate only affects the preview of the output.

Columns that are empty in the database are automatically hidden.

The hidden columns help optimizing the Aggregate.

The hidden columns are not part of the output.

That's Right!

Correct! The hidden columns will still be available in the output.

3. Which of the following elements can't be used to create calculated attributes in an Aggregate?

 \+ 1

Value of the attributes of the Source Entities.

Built-in Functions that can be translated to SQL (e.g. Length(), Power()).

Variables.

Server Actions using Entity Attributes.

That's Right!

We can't do that! Would it be possible to translate all Server Actions into SQL?

4. Consider that we want to apply aggregation functions in an Aggregate. Which of the following options is false?

 \+ 1

We can apply multiple aggregation functions inside an Aggregate.

The output of the Aggregate will contain all attributes from the Source Entities plus the aggregation columns.

We can apply the following functions on attributes of integer data type: sum, max, min, count and average.

The output of the aggregate will not include the grayed-out columns.

That's Right!

Yes, this is false. Only the aggregation columns are returned.

---

1. Business concepts that need to be stored and accessed in our applications should be modeled as...

 \+ 1

Entities.

Entity diagrams.

Entity relationships.

Database tables.

That's Right!

Ideally, each business concept will be mapped into a single entity.

2. Which of the following mappings between OutSystems and the Database is NOT correct?

 \+ 1

Entities - Tables.

Attributes - Columns.

Reference attribute - Primary Key.

Index - Index.

That's Right!

Ooops... Entity identifiers are the ones that are mapped into primary keys.

---

1. Which of the following statements about Entities is false?

 \+ 1

Entities have attributes.

Entities do not require an identifier.

Entities are only stored in memory.

Entities can be created, updated, and deleted.

That's Right!

Entities are persistent and are actually created in the database as tables.

2. If an Entity Attribute named HouseNumber is created, what needs to be done about its Data Type?

 \+ 1

It should be set to Integer.

It should be set to Decimal.

Nothing, it will automatically be set to Identifier.

Nothing, it will automatically be set to Integer.

That's Right!

The OutSystems Data Type Inference mechanism handles it.

3. Which of the following is not an Entity Action of the Customer Entity?

 \+ 1

CreateCustomer.

RetrieveCustomer.

UpdateCustomer.

DeleteCustomer.

That's Right!

The Entity Action that allows retrieving data is the Get.

---

1. Which of the following is a characteristic of a Static Entity?

 \+ 1

It can't be changed after the first publish.

It contains a set of Records.

It has two Entity Actions.

It can't be extended with any new attributes.

That's Right!

As many as you want but they need to be defined during development.

2. Regarding the Records of a Static Entity, which of the following options is false?

 \+ 1

The values for all 4 default attributes must be defined.

Records can only be added and removed during development.

The record identifier is the identifier of Static Entity.

The Identifier attribute is required for all Static Entities.

That's Right!

Attributes of static entities can be mandatory or not. A value is only required to be set if the attribute is mandatory.

3. Static Entities are most similar to which other programming concept?

 \+ 1

Linked lists.

Enumeration.

Hash Maps.

Static variables.

That's Right!

This is the closest one.

---

1. Regarding data relationships, which of the following options is correct?

 \+ 1

An Entity must have an identifier to allow relationships.

A reference attribute needs to be mandatory.

An Entity can only have one reference attribute.

The Entity identifier must be an integer.

That's Right!

The relationships are created by setting an attribute with data type Entity Identifier!

2. Which of the following steps is necessary to create a 1-to-1 relationship between Entity A and Entity B?

 \+ 1

Set the data type of the identifier attribute of Entity B to Entity A Identifier.

Add a new Entity C, with two reference attributes of type Entity A Identifier and Entity B Identifier.

Add a new reference attribute of type Entity B Identifier to Entity A.

Add a new Entity C, with the identifier attribute being a composition of types Entity A Identifier and Entity B Identifier.

That's Right!

Entity B will be an extension of Entity A, so they will share the same identifier.

3. Which of the following steps is necessary to create a 1-to-many relationship between a Master Entity A and a Detail Entity B?

 \+ 1

Set the data type of the identifier attribute of Entity B to Entity A Identifier.

Add a new Entity C, with two reference attributes of type Entity A Identifier and Entity B Identifier.

Entity A must have a reference attribute of type Entity B Identifier.

Entity B must have a reference attribute of type Entity A Identifier.

That's Right!

The Detail Entity has to reference the Master Entity.

4. Which of the following steps is necessary to create a many-to-many relationship between Entity A and Entity B?

 \+ 1

Set the data type of the identifier attribute of Entity B to Entity A Identifier.

Add a new reference attribute of type Entity B Identifier to Entity A.

Add a new Entity C, with two reference attributes of type Entity A Identifier and Entity B Identifier.

Add a new reference attribute of type Entity B Identifier to Entity A and a new reference attribute of type Entity A Identifier to Entity B.

That's Right!

Entity C will be the junction Entity that helps supporting the many-to-many relationship.

---

1. Which of the following events is not available in Screens or Blocks?

 \+ 0.75

Initialize

Ready

After Fetch

Render

That's Right!

This event is only available in Screen Aggregates and Data Actions. It acts upon data fetched from the database or server.

2. Considering the Initialize event of a Screen, which of the following would be the best use case for that event?

 \+ 0.75

Retrieve data from the server database.

Act on data returned by a Data Action.

Manipulate the DOM.

Set the default value of a Local Variable.

That's Right!

This is the perfect place for that!

3. Which of the following is the correct order of occurrence of events in a Screen?

 \+ 1

Initialize, Ready, Render, Destroy.

Initialize, Destroy, Ready, Render.

Ready, Initialize, Render, Destroy.

Initialize, Render, Ready, Destroy.

That's Right!

Remember that After Fetch only occurs for Screen Aggregates and Data Actions.

---

1. Which of the following options is correct, when implementing pagination with Tables or Lists?

 \+ 1

The Start Index property of the Pagination holds the current page number.

The Max Records property of the Pagination holds the number of records to show per page.

The Total Count input of the Pagination pattern should be set to the number of records per page.

That's Right!

Whereas the Start Index is the offset.

2. Regarding sorting in a Table, which of the following options is correct?

 \+ 1

All header cells need to have the Sort Attribute property defined.

Only the Sort Attribute of the header cells needs to be defined. Data is refreshed automatically.

The On Sort event has an input parameter containing the clicked column.

That's Right!

And that input is associated with the column that the end-user selected to sort by.

3. Regarding sorting Lists, which of the following options is correct?

 \+ 1

Lists have a built-in On Sort event.

Sort clauses cannot be changed dynamically at runtime when using Lists.

Other Widgets should be used to allow the end-user to define the sort criteria.

That's Right!

Those Widgets would trigger a refresh of the data with the new sort criteria.

---

1. In OutSystems, where can we place breakpoints?

 \+ 1

In Actions only (Client-side and Server-Side)

Server-side logic only

Client-side logic only

In Actions and Variables

That's Right!

Correct! Breakpoints can only be placed in action flows, regardless of whether they are client or server-side.

2. In OutSystems, it is possible to inspect the values of variables while debugging.

 \+ 1

True

False

That's Right!

It's possible to inspect the values of variables when debugging the code, depending on their scope.

3. Which of the following commands is not available in the OutSystems debugger?

 \+ 1

Stop Debugging

Continue Request

Step Over

Restart Debugging

That's Right!

You can't restart debug while its instance is being executed. You can, however, stop and start it again.

4. When debugging a consumer module, how do we guarantee that the execution stops on breakpoints defined in the producer module?

 \+ 1

We just need to set breakpoints in the producer module. The execution will stop on its breakpoints automatically.

We need to also start the debugger on the producer module.

Nothing, just leave Service Studio open.

In the producer, set the Entry Module property to the consumer module.

That's Right!

That's right! After this step, we can inspect the logic of any action.

---

1. Which of the following options is correct regarding Client Variables?

 \+ 1

The value of a Client Variable is shared among all logged-in users.

Lists or Binary Data can also be stored on Client Variables.

Client Variables should be used to store confidential information.

Client Variables are useful to cache frequently accessed information.

That's Right!

By caching frequently accessed values on Client Variables, it is possible to avoid requests to the server or database.

2. Which of the following would be a good use case for a Client Variable?

 \+ 1

Credit Card Number

Profile Picture

User Identifier

User Name

That's Right!

Since the name of the logged-in user is shown frequently, this is a good candidate for a Client Variable.

---

1. Considering Users and Roles in OutSystems, which of the following options is correct?

 \+ 1

By default, end-users are managed in the built-in Users application.

End-users can only be created programmatically, using Actions from the Users application.

There are three built-in roles in OutSystems: Anonymous, AppUser and Registered.

All users, with or without a login, have automatically the Registered Role.

That's Right!

The Users app can be accessed using the browser, where users can be created and managed.

2. In OutSystems, how do we restrict access to a Screen?

 \+ 1

Go to the Users application and associate the Screen to a specific role.

In the Screen Properties, untick roles to restrict their access.

Use the CheckRole Action.

We don't. Only users with a username and password can access.

That's Right!

Correct! There's a checkbox for every Role in the app.

3. Considering the built-in Role Actions, which of the following options is false?

 \+ 1

The CheckRole Action checks if a user has that particular Role.

The GrantRole Action allows to grant a Role to a user programmatically.

The RevokeRole Action allows to remove a Role from a user programmatically.

The CreateUserWithRole Action creates an end-user and assigns it the Role.

That's Right!

This Action does not exist. This is actually a two step operation: create the user, and assign a role to the user.

---

. Which of the following options is correct?

 \+ 1

Screen Actions can call other Screen Actions from a different screen.

Client Actions can call Screen Actions.

Server Actions can call Client Actions.

Client Actions can call Server Actions.

That's Right!

Similarly, Screen Actions can also call Server Actions.

2. Client Actions and Server Actions can have the following variables:

 \+ 1

Input and Output Parameters, but no Local variables.

Input Parameters and Local Variables, but no Output Parameters.

Input and Output Parameters, as well as Local Variables.

Output Parameters and Local Variables, but no Input Parameters.

That's Right!

They can have multiple input, output and local variables.

3. The flow of an action can have...

 \+ 1

... multiple Start and End nodes.

... one or more Start nodes but only one End node.

... only one Start node but multiple End nodes.

... only one Start node and one End node.

That's Right!

Action Flows can only have one Start node and can end in different End nodes.

---

1. Regarding the If statement, which of the following options is false?

 \+ 0.25

Both True and False branches are mandatory.

Only one of the branches is executed, depending on the If condition's outcome.

If statements can also be used to implement ad-hoc loops.

More branches may be added if needed.

That's Right!

Not to an If. Although in Switch statements that is possible.

2. Regarding the Switch statement, which of the following options is false?

 \+ 1

The first branch that the condition evaluates to True is executed.

Every branch that evaluates to True is executed.

If no branch evaluates to True, the Otherwise branch is executed.

The Otherwise branch must exist.

That's Right!

Only one branch of the Switch is executed: the first one that evaluates to True. If none, then the Otherwise is executed.

---

1. Inside an Action flow...

 \+ 1

... only one Exception Handler may exist.

... it's mandatory to have at least one Exception Handler.

... the Exception Handler flow can't intersect other flows.

That's Right!

Each flow must be independent from the others.

2. If we have multiple Exception Handlers in an Action flow and an Exception is raised...

 \+ 1

... the execution is always moved to the Global Exception Handler.

... the execution is moved to the Exception Handler that is most specific to the Exception.

... the execution is moved to all Exception Handlers of the Action.

... a Switch statement is needed to select which Exception Handler will continue the execution.

That's Right!

Different Exceptions are handled by different specific Handlers.

---

1. Which of the following behaviors does not apply to Forms?

 \+ 1

A Form groups input widgets and allows displaying and editing data.

A Form has a Source property that will hold the values submitted by the user.

Besides input widgets, a Form can hold other widgets such as Links and Buttons.

A Form is useful to validate data submitted by the user.

That's Right!

It's actually the Inputs within a Form that has a Variable property that will have the value in each Input.

2. Considering the Dropdown and the Button Group, which of the following options is false?

 \+ 1

A Button Group needs a Button Group Item to represent each option that the user will have available to choose from.

The List property of the Dropdown defines the data that will appear as options to a user on a Screen.

Each Button Group Item within a Button Group has a Variable property to save the option chosen by the user.

The Variable property of the Dropdown will hold the value selected by the user. That value is defined in the Options Value property.

That's Right!

This is indeed a false statement. The Variable property actually belongs to the Button Group, which is where the value of the chosen Item will be saved.

3. The Checkbox or Switch Widgets are bound to a variable of which type?

 \+ 1

Text

Integer

Boolean

Date

That's Right!

That's it. True or false!

4. Considering Inputs and Labels, which of the following options is correct?

 \+ 1

Every input must have a Label associated with.

An input widget can only be used for the Text data type.

To access the value submitted in an Input widget, we can simply use InputName.Value.

Labels associated with mandatory fields will display a visual cue on the Screen.

That's Right!

That is actually a big advantage in having them!

---

1. If an Action that handles the On Render event on a screen, changes some of the screen data, what would be a possible scenario ?

 \+ 0.75

Nothing happens

We could run into an infinite loop as the action flow would become recursive.

it is not possible to run actions to handle the On Render event

It is only possible to change screen variables at the On Initialize event

That's Right!

The data change could enforce a screen re-render and there for the Action flow would run again as the On Render event will be triggered.

1. If an input parameter value of a Block is changed by its parent, then

 \+ 1

nothing happens.

the Block's On Parameter Changed event is triggered. If an handler is define it will run.

we will get an error since the Block's input parameters can only be accessed inside the Block scope.

the Block's On Parameters Changed event is triggered only once. Further changes to input parameters will be ignored.

That's Right!

Yes. This is the defined behaviour.

---





## List of headings and sections

(Key headings only)

**Becoming a web developer**

Progress

100% 



Section 1

OutSystems overview

OutSystems overview

2 min

OutSystems components and tools

5 min

OutSystems capabilities

3 min

Quiz

3 min

Section 2

Service Studio Overview

Service Studio overview

4 min

Service Studio walkthrough

3 min

Application layers

3 min

1-Click Publish

2 min

Quiz

2 min

Section 3

Intro to OutSystems development

Introducing OutSystems Apps

5 min

Modular programming

6 min

How To Create a Reactive Web App

2 min

Create Employee Directory App

3 min

Quiz

4 min

Section 4

Modeling data

Modeling Data

5 min

Database Entities

28 min

Static Entities

12 min

Section 5

Modeling Data Relationships

Modeling Data Relationships

5 min

1-to-Many Relationship

3 min

1-to-Many Relationship Exercise

5 min

1-to-1 Relationship

4 min

1-to-1 Relationship Exercise

5 min

Many-to-Many Relationship

4 min

Many-to-Many Relationship Exercise

4 min

Quiz

4 min

Section 6

Data Model Integrity

Data model integrity

3 min

Demo: How To Create a Unique Index in an Entity

2 min

How To Define Delete Rules on Foreign Keys

1 min

Quiz

2 min

Section 7

UI development 101

Section 8

Aggregates 101

Aggregates 101

3 min

Aggregates Outputs and Properties

3 min

How To Fetch Data in an Aggregate

2 min

Fetch Data with Aggregates Exercise

4 min

How To Filter Data in an Aggregate

2 min

Filter Data with Aggregates Exercise

3 min

How To Sort Data in an Aggregate

1 min

Sort Data with Aggregates Exercise

4 min

How To Test Values in an Aggregate

1 min

Quiz

4 min

Section 9

Building Screens with Data

Displaying Data on Screens

4 min

Table and List Widgets

26 min

Section 10

Building Web Forms

Building Reactive Web Forms

5 min

Widgets

53 min

Section 11

Logic

Actions and Flows

53 min

Exceptions

4 min

Section 12

Form Validations

Form Validations

5 min

How To use the Built-in Form Validations

3 min

Demo: How To Define Custom Form Validations

4 min

Form Validations Exercise

12 min

Quiz

3 min

Section 13

Advanced Aggregates

Advanced Aggregates

5 min

How To Fetch Data from Multiple Sources in Aggregates

2 min

Fetch data from multiple sources exercise

8 min

How To Create Calculated Attributes in Aggregates

1 min

Creating Calculated Attributes Exercise

6 min

How To Create Aggregation Functions in Aggregates

2 min

Creating Aggregation Function in Aggregate Exercise

5 min

Quiz

4 min

Section 14

Role-based security

Role-based security

5 min

How To Grant a Role to a User

2 min

Granting role to users exercise

7 min

How To Control Authorization on Screens

2 min

Authorization on screen exercise

4 min

How To Control Authorization in Logic

4 min

Authorization in logic exercise

12 min

Quiz

3 min

Section 15

Debugging in OutSystems

Section 16

Pagination and Sorting

Pagination

11 min

Sorting

15 min

Quiz

3 min

Section 17

Blocks and Events

Blocks

27 min

Events

30 min

Section 18

Reactive Programming Model

Screen events

7 min

Fetching Data On Demand

27 min

Section 19

Client Variables

Section 20

Site Properties

Section 21

SQL Queries

SQL Queries

6 min

How To Create a Custom SELECT SQL Query

3 min

How To Convert an Aggregate to a SQL Query

3 min

Demo: How To Create a Custom INSERT SQL Query

2 min

Demo: How To Create a Custom UPDATE SQL Query

2 min

Demo: How To Create a Custom DELETE SQL Query

1 min

Using custom SQL queries exercise

12 min

Quiz

4 min
