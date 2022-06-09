module Pages.EditItem exposing (Model, Msg, init, subscriptions, update, view)

import Browser
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)



-- FLAGS

type alias Flags =
    {}


-- MAIN


main : Program Flags Model Msg
main =
    Browser.document
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }



-- MODEL


type alias Field =
    { name : String
    , value : String
    }


type alias Tab =
    { fields : List Field
    }


type alias Model =
    { tabs : List Tab
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { tabs = [] }, Cmd.none )



-- UPDATE


type Msg
    = None


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        _ ->
            ( model, Cmd.none )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- VIEW


view : Model -> Browser.Document Msg
view model =
    { title = "Edit Item"
    , body =
        [ text "Edit Item"
        , nameView
        , formView
        ]
    }

nameView : Html Msg
nameView =
    div []
        [ label [ for "name" ] [ text "name" ]
        , input [ id "name", value "" ] []
        ]

formView : Html Msg
formView =
    text "form"

tabView : Html Msg
tabView =
    text "tab"


fieldView : String -> Html Msg
fieldView name =
    div []
        [ label [ for name ] [ text name ]
        , input [ id name, value "" ] []
        ]
