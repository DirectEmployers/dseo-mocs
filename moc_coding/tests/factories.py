import factory
from slugify import slugify
from ..models import *


class OnetFactory(factory.Factory):
    FACTORY_FOR = Onet

    title = "Some Onet"
    code = "99999999"


class MocFactory(factory.Factory):
    FACTORY_FOR = Moc
    
    code = "01"
    branch = "coast-guard"
    title = "General Command and Staff"
    title_slug = factory.LazyAttribute(lambda x: slugify(x.title))
    moc_detail_id = 1


class MocDetailFactory(factory.Factory):
    FACTORY_FOR = MocDetail

    id = 1
    primary_value = "01"
    service_branch = "c"
    military_description = "General Command and Staff"
    civilian_description = "Business General"


class CustomCareerFactory(factory.Factory):
    FACTORY_FOR = CustomCareer

    moc_id = 1
    onet_id = 1
    content_type_id = 1
    object_id = 1
    
