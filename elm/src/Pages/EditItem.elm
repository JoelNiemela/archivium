module Pages.EditItem exposing (Model, Msg, init, subscriptions, update, view)

import Browser
import Http
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Dict exposing (Dict)
import Array exposing (Array)
import Array.Extra as Array
import Json.Encode as Encode
import Json.Decode as Decode
import Json.Decode.Extra as Decode


-- FLAGS


type alias Flags =
    String


-- MAIN


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


-- MODEL


type Value
    = Text String


type alias Field =
    { name : String
    , value : Value
    }


type alias Tab =
    { name : String
    , fields : Array Field
    }


type alias Data =
    { title : String
    , tabs : Array Tab
    , authorId : Int
    , universeId : Int
    , parentId : Maybe Int
    , createdAt : String
    , updatedAt : String
    , author : String
    , universe : String
    }


type alias Model =
    { data : Data
    , currentTab : Int
    }


-- ENCODERS


encodeValue : Value -> Encode.Value
encodeValue value =
    case value of
        Text str ->
            Encode.string str


encodeField : Field -> Encode.Value
encodeField field =
    Encode.list identity
        [ Encode.string field.name
        , encodeValue field.value
        ]


encodeTab : Tab -> Encode.Value
encodeTab tab =
    Encode.list identity
        [ Encode.string tab.name
        , Encode.array encodeField tab.fields
        ]

encodeData : Model -> Encode.Value
encodeData model =
    Encode.object
        [ ("title", Encode.string model.data.title)
        , ("objData", Encode.array encodeTab model.data.tabs)
        ]


-- DECODERS

valueDecoder : Decode.Decoder Value
valueDecoder =
    Decode.oneOf
        [ Decode.map Text Decode.string
        ]


fieldDecoder : Decode.Decoder Field
fieldDecoder =
    Decode.map2 Field
        (Decode.index 0 Decode.string)
        (Decode.index 1 valueDecoder)

fieldsDecoder : Decode.Decoder (Array Field)
fieldsDecoder =
    Decode.array fieldDecoder


tabDecoder : Decode.Decoder Tab
tabDecoder =
    Decode.map2 Tab
        (Decode.index 0 Decode.string)
        (Decode.index 1 fieldsDecoder)


tabsDecoder : Decode.Decoder (Array Tab)
tabsDecoder =
    Decode.array tabDecoder


dataDecoder : Decode.Decoder Data
dataDecoder =
    Decode.succeed Data
        |> Decode.andMap (Decode.field "title" Decode.string)
        |> Decode.andMap (Decode.field "objData" tabsDecoder)
        |> Decode.andMap (Decode.field "authorId" Decode.int)
        |> Decode.andMap (Decode.field "universeId" Decode.int)
        |> Decode.andMap (Decode.field "parentId" (Decode.nullable Decode.int))
        |> Decode.andMap (Decode.field "createdAt" Decode.string)
        |> Decode.andMap (Decode.field "updatedAt" Decode.string)
        |> Decode.andMap (Decode.field "author" Decode.string)
        |> Decode.andMap (Decode.field "universe" Decode.string)
    |> Decode.field "item"


init : Flags -> ( Model, Cmd Msg )
init flags =
    case Decode.decodeString dataDecoder flags of
        Ok data ->
            ( { data = data, currentTab = 0 }, Cmd.none )

        Err _ ->
            (
                { data =
                    { title = ""
                    , tabs = Array.fromList []
                    , authorId = 0
                    , universeId = 0
                    , parentId = Nothing
                    , createdAt = ""
                    , updatedAt = ""
                    , author = ""
                    , universe = ""
                    }
                , currentTab=0
                }
            , Cmd.none )


-- MODEL ACCESSOR FUNCTIONS


getTab : Int -> Model -> Maybe Tab
getTab tabId model =
    Array.get tabId model.data.tabs


getTabFields : Int -> Model -> Maybe (Array Field)
getTabFields tabId model =
    Maybe.map .fields
        <| getTab tabId model


getTabField : Int -> Tab -> Maybe Field
getTabField fieldId tab = 
    Array.get fieldId tab.fields


getField : Int -> Int -> Model -> Maybe Field
getField tabId fieldId model =
    getTab tabId model
        |> Maybe.andThen (getTabField fieldId)

-- UPDATE


type Msg
    = None
    | EditTitle String              -- title
    | EditTabName Int String        -- tabId name
    | EditFieldName Int Int String  -- tabId fieldId name
    | EditField Int Int String      -- tabId fieldId value
    | AddTab
    | AddField Int                  -- tabId
    | DeleteTab Int                 -- tabId
    | DeleteField Int Int           -- tabId fieldId
    | MoveTabUp Int                 -- tabId
    | MoveTabDown Int               -- tabId
    | MoveFieldUp Int Int           -- tabId fieldId
    | MoveFieldDown Int Int         -- tabId fieldId
    | Save
    | Saved (Result Http.Error String)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        EditTitle title ->
            let
                modelData =
                    model.data

                data =
                    { modelData | title = title }
            in
            ( updateData data model, Cmd.none )

        EditTabName tabId name ->
            case getTab tabId model of
                Just tab ->
                    let
                        updatedModel =
                            updateTab tabId { tab | name = name } model
                    in
                    ( updatedModel, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        EditFieldName tabId fieldId name ->
            case getField tabId fieldId model of
                Just field ->
                    let
                        updatedModel =
                            updateField tabId fieldId { field | name = name } model
                    in
                    ( updatedModel, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        EditField tabId fieldId value ->
            case getField tabId fieldId model of
                Just field ->
                    let
                        updatedModel =
                            updateField tabId fieldId { field | value = Text value } model
                    in
                    ( updatedModel, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        AddTab ->
            let
                tab =
                    {name = "", fields = Array.fromList []}

                updatedModel =
                    updateTabs (Array.push tab model.data.tabs) model
            in
            ( updatedModel, Cmd.none )

        AddField tabId ->
            case getTab tabId model of
                Just tab ->
                    let
                        field =
                            {name = "", value = Text ""}

                        updatedFields =
                            Array.push field tab.fields

                        updatedModel =
                            updateTab tabId { tab | fields = updatedFields } model
                    in
                    ( updatedModel, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        DeleteTab tabId ->
            let
                updatedModel =
                    updateTabs (Array.removeAt tabId model.data.tabs) model
            in
            ( updatedModel, Cmd.none )

        DeleteField tabId fieldId ->
            case getTab tabId model of
                Just tab ->
                    let
                        updatedFields =
                            Array.removeAt fieldId tab.fields

                        updatedModel =
                            updateTab tabId { tab | fields = updatedFields } model
                    in
                    ( updatedModel, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        MoveTabUp tabId ->
            case getTab tabId model of
                Just tab ->
                    let
                        data =
                            if tabId > 0 then
                                Array.removeAt tabId model.data.tabs
                                |> Array.insertAt (tabId-1) tab
                            else
                                model.data.tabs

                        updatedModel =
                            updateTabs data model

                    in
                    ( updatedModel, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        MoveTabDown tabId ->
            case getTab tabId model of
                Just tab ->
                    let
                        data =
                            if tabId < (Array.length model.data.tabs - 1) then
                                Array.removeAt tabId model.data.tabs
                                |> Array.insertAt (tabId+1) tab
                            else
                                model.data.tabs

                        updatedModel =
                            updateTabs data model

                    in
                    ( updatedModel, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        MoveFieldUp tabId fieldId ->
            case (getTab tabId model, getField tabId fieldId model) of
                (Just tab, Just field) ->
                    let
                        fields =
                            if fieldId > 0 then
                                Array.removeAt fieldId tab.fields
                                |> Array.insertAt (fieldId-1) field
                            else
                                tab.fields

                        updatedModel =
                            updateTab tabId { tab | fields = fields } model

                    in
                    ( updatedModel, Cmd.none )

                _ ->
                    ( model, Cmd.none )

        MoveFieldDown tabId fieldId ->
            case (getTab tabId model, getField tabId fieldId model) of
                (Just tab, Just field) ->
                    let
                        fields =
                            if fieldId < (Array.length tab.fields - 1) then
                                Array.removeAt fieldId tab.fields
                                |> Array.insertAt (fieldId+1) field
                            else
                                tab.fields

                        updatedModel =
                            updateTab tabId { tab | fields = fields } model

                    in
                    ( updatedModel, Cmd.none )

                _ ->
                    ( model, Cmd.none )

        Save ->
            let
                json = encodeData model

                request =
                    Http.request
                        { method = "PUT"
                        , headers = [Http.header "Content-type" "application/json"]
                        , url = "http://localhost:80/put"
                        , body = Http.jsonBody json
                        , expect = Http.expectString Saved 
                        , timeout = Nothing
                        , tracker = Nothing
                        }

            in ( model, request )

        Saved res ->
            let
                _ = case res of
                    Ok val ->
                        Debug.log "" val
            
                    _ ->
                        ""
            in
            ( model, Cmd.none )

        _ ->
            ( model, Cmd.none )


updateData : Data -> Model -> Model
updateData data model =
    { model | data = data }


updateTabs : Array Tab -> Model -> Model
updateTabs tabs model =
    let
        modelData = 
            model.data
        
        data =
            { modelData | tabs = tabs }
    in
    updateData data model


updateTab : Int -> Tab -> Model -> Model
updateTab tabId tab model =
    let
        data =
            Array.set tabId tab model.data.tabs
    in updateTabs data model


updateField : Int -> Int -> Field -> Model -> Model
updateField tabId fieldId field model =
    case getTab tabId model of
        Just tab ->
            let
                fields = Array.set fieldId field tab.fields
            in
            updateTab tabId { tab | fields = fields } model

        -- Return original model if tab or field is not found
        _ ->
            model

-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- VIEW


view : Model -> Html Msg
view model =
    div []
        [ text "Edit Item"
        , nameView model.data.title
        , formView <|
            Array.toList model.data.tabs
        , br [] []
        , button [ onClick Save, class "elmBtnPrimary" ] [ text "Save" ]
        ]


nameView : String -> Html Msg
nameView name =
    div []
        [ label [ for "name" ] [ text "name" ]
        , input [ id "name", value name, onInput EditTitle ] []
        ]


formView : List Tab -> Html Msg
formView tabs =
    div [ class "elmTabList" ]
        [ div [] 
            <| List.indexedMap tabView tabs
        , button [ onClick AddTab, class "elmBtnPrimary" ] [ text "Add Tab" ]
        ]


tabView : Int -> Tab -> Html Msg
tabView tabId tab =
    div [ class "elmTab" ]
        [ input [ value tab.name, onInput (EditTabName tabId) ] []
        , div []
            <| List.indexedMap (fieldView tabId)
            <| Array.toList tab.fields
        , button [ onClick (AddField tabId), class "elmBtnPrimary" ] [ text "Add Field" ]
        , button [ onClick (DeleteTab tabId), class "elmBtnDelete" ] [ text "Delete" ]
        , button [ onClick (MoveTabUp tabId), class "elmBtn" ] [ text "↑" ]
        , button [ onClick (MoveTabDown tabId), class "elmBtn" ] [ text "↓" ]
        ]

fieldView : Int -> Int -> Field -> Html Msg
fieldView tabId fieldId field =
    div []
        [ button [ onClick (DeleteField tabId fieldId), class "elmBtnDelete" ] [ text "✕" ]
        , input [ value field.name, onInput (EditFieldName tabId fieldId) ] []
        , input [ value (valueView field.value), onInput (EditField tabId fieldId) ] []
        , button [ onClick (MoveFieldUp tabId fieldId), class "elmBtn" ] [ text "↑" ]
        , button [ onClick (MoveFieldDown tabId fieldId), class "elmBtn" ] [ text "↓" ]
        ]


valueView : Value -> String
valueView value =
    case value of
        Text str -> str
